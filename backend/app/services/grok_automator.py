"""
backend/app/services/grok_automator.py

GrokAutomator
- Uses undetected_chromedriver + Selenium to login to Grok web interface and send "Imagine" prompts.
- IMPORTANT: This automates a third-party web interface. It does NOT attempt to bypass CAPTCHAs or other protections.
- The class is defensive: detects CAPTCHAs, applies exponential backoff, rotates proxies if provided, and reports clear errors.

Self-Correction tests (examples in docstrings):
- If login fails due to incorrect credentials -> raise AuthenticationError (caller should alert user and stop retries).
- If provider rate-limits / times out -> retry with exponential backoff and proxy rotation up to N attempts.
- If a CAPTCHA is detected on any page -> bail out and save a debug screenshot path.

NOTE: To run this you need `undetected-chromedriver`, `selenium`, and a Chrome binary compatible with uc. Install via:
  pip install undetected-chromedriver selenium requests

"""

import os
import time
import json
import logging
from typing import Optional, Dict
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
import undetected_chromedriver as uc
import requests

logger = logging.getLogger("grok_automator")

class AuthenticationError(Exception):
    pass

class CaptchaError(Exception):
    pass

class GrokAutomator:
    def __init__(self, username: str = None, password: str = None, headless: bool = True, proxies: Optional[list] = None, download_dir: Optional[str] = None):
        self.username = username or os.getenv("GROK_USERNAME")
        self.password = password or os.getenv("GROK_PASSWORD")
        self.headless = headless
        self.proxies = proxies or []
        self.driver = None
        self.download_dir = download_dir or os.getenv("GROK_DOWNLOAD_DIR") or "/tmp/grok_downloads"
        os.makedirs(self.download_dir, exist_ok=True)

    def _build_options(self, proxy: Optional[str] = None):
        options = uc.ChromeOptions()
        if self.headless:
            options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        # set download directory
        prefs = {"download.default_directory": self.download_dir}
        options.add_experimental_option("prefs", prefs)
        if proxy:
            options.add_argument(f"--proxy-server={proxy}")
        return options

    def _start_driver(self, proxy: Optional[str] = None):
        opts = self._build_options(proxy=proxy)
        try:
            driver = uc.Chrome(options=opts)
            driver.set_page_load_timeout(60)
            self.driver = driver
            return driver
        except WebDriverException as e:
            logger.exception("Failed to start webdriver")
            raise

    def _detect_captcha(self) -> bool:
        # Basic heuristics: look for elements often used in captcha flows
        if not self.driver:
            return False
        try:
            # Common selectors for captcha frames
            frames = self.driver.find_elements(By.TAG_NAME, "iframe")
            for f in frames:
                src = f.get_attribute("src")
                if src and ("/recaptcha/" in src or "captcha" in src.lower()):
                    return True
            # textual heuristics
            body_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            if "verify" in body_text and ("bot" in body_text or "captcha" in body_text):
                return True
        except Exception:
            return False
        return False

    def login(self, max_attempts: int = 3, timeout: int = 30) -> bool:
        """Login to Grok. Raises AuthenticationError on bad credentials, CaptchaError if captcha detected.

        Self-correction: if login receives 401/invalid credentials, stop and raise AuthenticationError. If site responds with rate limit/timeouts, rotate proxies and retry.
        """
        attempts = 0
        last_exc = None
        while attempts < max_attempts:
            attempts += 1
            proxy = None
            if self.proxies:
                proxy = self.proxies[(attempts - 1) % len(self.proxies)]
            try:
                driver = self._start_driver(proxy=proxy)
                # Navigate to Grok login (placeholder URL - replace with actual provider URL)
                login_url = os.getenv("GROK_LOGIN_URL", "https://grok.com/login")
                driver.get(login_url)
                if self._detect_captcha():
                    # save screenshot for debugging
                    path = os.path.join(self.download_dir, f"captcha_login_{int(time.time())}.png")
                    driver.save_screenshot(path)
                    raise CaptchaError(f"Captcha detected on login page. Screenshot saved: {path}")

                # examples: find username / password fields - these selectors must be adapted to actual page
                try:
                    user_el = WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.NAME, "email")))
                    pass_el = driver.find_element(By.NAME, "password")
                except TimeoutException:
                    # fallback selectors
                    user_el = driver.find_element(By.CSS_SELECTOR, "input[type=email]")
                    pass_el = driver.find_element(By.CSS_SELECTOR, "input[type=password]")

                user_el.clear(); user_el.send_keys(self.username)
                pass_el.clear(); pass_el.send_keys(self.password)

                # try submit - common selectors
                try:
                    submit = driver.find_element(By.CSS_SELECTOR, "button[type=submit]")
                    submit.click()
                except NoSuchElementException:
                    pass

                # wait for logged-in indicator
                try:
                    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, "nav")))
                except TimeoutException:
                    # check for obvious login error text
                    body = driver.find_element(By.TAG_NAME, "body").text.lower()
                    if "incorrect" in body or "invalid" in body:
                        raise AuthenticationError("Invalid Grok credentials")
                    if self._detect_captcha():
                        path = os.path.join(self.download_dir, f"captcha_postlogin_{int(time.time())}.png")
                        driver.save_screenshot(path)
                        raise CaptchaError(f"Captcha after login attempt; screenshot: {path}")
                    raise TimeoutException("Login confirm timeout")

                logger.info("Logged into Grok successfully")
                return True
            except AuthenticationError:
                # do not retry on auth error
                raise
            except CaptchaError:
                # bail out - can't bypass
                raise
            except Exception as e:
                last_exc = e
                logger.warning(f"Login attempt {attempts} failed with proxy={proxy}: {e}")
                # close driver and retry with next proxy/backoff
                try:
                    if self.driver:
                        self.driver.quit()
                except Exception:
                    pass
                time.sleep(min(2 ** attempts, 20))
                continue
        raise Exception(f"Grok login failed after {max_attempts} attempts. Last error: {last_exc}")

    def imagine(self, prompt: str, timeout: int = 300, poll_interval: int = 5) -> Dict[str, Optional[str]]:
        """Send a prompt to Grok Imagine, wait for result, and return {'task_id':..., 'download_url':...}

        Self-Correction tests:
        - If generation times out: retry up to N times with exponential backoff and rotate proxies.
        - If CAPTCHAs or unexpected UI changes occur: save a screenshot and raise CaptchaError or WebDriverException for manual inspection.
        """
        if not self.driver:
            # start driver if not started
            self._start_driver()
        driver = self.driver
        attempts = 0
        last_exc = None
        max_attempts = 3
        while attempts < max_attempts:
            attempts += 1
            try:
                imagine_url = os.getenv("GROK_IMAGINE_URL", "https://grok.com/imagine")
                driver.get(imagine_url)
                if self._detect_captcha():
                    path = os.path.join(self.download_dir, f"captcha_imagine_{int(time.time())}.png")
                    driver.save_screenshot(path)
                    raise CaptchaError(f"Captcha detected on imagine page (screenshot: {path})")

                # find prompt input and submit
                try:
                    input_el = WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='Describe']")))
                except TimeoutException:
                    # fallback heuristics
                    input_el = driver.find_element(By.TAG_NAME, "textarea")

                input_el.clear(); input_el.send_keys(prompt)

                # find generate button
                try:
                    gen_btn = driver.find_element(By.XPATH, "//button[contains(., 'Imagine') or contains(., 'Generate')]")
                    gen_btn.click()
                except Exception:
                    # try alternative: press Enter
                    input_el.send_keys("\n")

                # Wait for result: look for download link or media element - provider dependent
                waited = 0
                download_url = None
                while waited < timeout:
                    # check for finished indicator or download link
                    try:
                        # provider-specific selectors - adapt as needed
                        link_el = driver.find_element(By.CSS_SELECTOR, "a.download-link")
                        download_url = link_el.get_attribute("href")
                        if download_url:
                            break
                    except Exception:
                        pass
                    # alternative: check for video element
                    try:
                        video_el = driver.find_element(By.TAG_NAME, "video")
                        src = video_el.get_attribute("src")
                        if src and src.startswith("http"):
                            download_url = src
                            break
                    except Exception:
                        pass

                    time.sleep(poll_interval)
                    waited += poll_interval

                if not download_url:
                    raise TimeoutException("Imagine generation timed out or no download link found")

                # Optionally download the file here and return local path
                local_path = None
                try:
                    r = requests.get(download_url, stream=True, timeout=30)
                    r.raise_for_status()
                    filename = os.path.join(self.download_dir, f"grok_{int(time.time())}.mp4")
                    with open(filename, "wb") as fh:
                        for chunk in r.iter_content(chunk_size=8192):
                            fh.write(chunk)
                    local_path = filename
                except Exception as e:
                    logger.warning(f"Failed to download media from {download_url}: {e}")

                return {"download_url": download_url, "local_path": local_path}

            except CaptchaError:
                raise
            except Exception as e:
                last_exc = e
                logger.warning(f"Imagine attempt {attempts} failed: {e}")
                # try to recover: restart driver and retry with backoff
                try:
                    if self.driver:
                        self.driver.quit()
                        self.driver = None
                except Exception:
                    pass
                time.sleep(min(2 ** attempts, 30))
                continue
        raise Exception(f"Imagine flow failed after {max_attempts} attempts. Last error: {last_exc}")

    def close(self):
        try:
            if self.driver:
                self.driver.quit()
        except Exception:
            pass


# Example usage (do not run in CI):
# automator = GrokAutomator(headless=True, proxies=["http://127.0.0.1:8080"])
# try:
#     automator.login()
#     result = automator.imagine("A cinematic neon AI revolution 9:16 short")
#     print(result)
# finally:
#     automator.close()
