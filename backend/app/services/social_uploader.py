"""
backend/app/services/social_uploader.py

SocialUploader
- Helpers to upload video files to social platforms (TikTok, Instagram Reels) using Playwright.
- Uses Playwright to control browser sessions and upload via the web UI, with cookie/session helpers.
- This implementation focuses on structure, defensive checks, and clear error reporting. It does NOT include any attempts to bypass captchas or bot protections.

Requirements:
  pip install playwright requests
  playwright install chromium

Note: Playwright is preferred here over Selenium because it handles modern web UIs and file uploads more reliably in headless servers.
"""

import os
import time
import logging
from typing import Optional, Dict
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger("social_uploader")

class UploadError(Exception):
    pass

class SocialUploader:
    def __init__(self, headless: bool = True, download_dir: Optional[str] = None):
        self.headless = headless
        self.download_dir = download_dir or os.getenv("SOCIAL_DOWNLOAD_DIR") or "/tmp/social_uploads"
        os.makedirs(self.download_dir, exist_ok=True)

    def _save_cookies(self, context, path: str):
        storage = context.storage_state()
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(storage)

    def _load_cookies(self, browser, path: str):
        if not os.path.exists(path):
            return None
        return path

    def upload_tiktok(self, video_path: str, caption: str = "", cookies_path: Optional[str] = None, timeout: int = 120) -> Dict[str, str]:
        """Upload a video to TikTok via web upload flow. Returns {'post_url':...}

        - `video_path` must be a local file path.
        - `cookies_path` can point to a previously saved Playwright storage_state.json for an authenticated session.
        """
        if not Path(video_path).exists():
            raise UploadError("video_path does not exist")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            context = browser.new_context()
            # load cookies if provided
            if cookies_path and os.path.exists(cookies_path):
                context = browser.new_context(storage_state=cookies_path)
            page = context.new_page()
            try:
                page.goto("https://www.tiktok.com/upload?lang=en", timeout=30000)
                # wait for upload input
                try:
                    page.wait_for_selector("input[type=file]", timeout=15000)
                    page.set_input_files("input[type=file]", video_path)
                except PlaywrightTimeoutError:
                    raise UploadError("Upload input not found on TikTok upload page. Possibly blocked or UI changed.")

                # Wait for processing and set caption
                if caption:
                    try:
                        page.fill("textarea[placeholder*='caption']", caption)
                    except PlaywrightTimeoutError:
                        # try alternative selector
                        try:
                            page.fill("textarea", caption)
                        except Exception:
                            logger.warning("Could not set caption; continuing")

                # Click post/upload button
                try:
                    page.click("button:has-text('Post')", timeout=10000)
                except PlaywrightTimeoutError:
                    # try alternative
                    try:
                        page.click("button:has-text('Upload')", timeout=5000)
                    except Exception as e:
                        raise UploadError(f"Failed to click Post button: {e}")

                # Wait for navigation or success indication
                try:
                    page.wait_for_url("**/video/**", timeout=60000)
                    post_url = page.url
                except PlaywrightTimeoutError:
                    # fallback: look for success snackbar
                    post_url = page.url

                # Save cookies for future sessions
                storage_path = os.path.join(self.download_dir, f"tiktok_storage_{int(time.time())}.json")
                context.storage_state(path=storage_path)

                return {"post_url": post_url, "cookies": storage_path}
            finally:
                try:
                    context.close()
                    browser.close()
                except Exception:
                    pass

    def upload_instagram_reel(self, video_path: str, caption: str = "", cookies_path: Optional[str] = None, timeout: int = 120) -> Dict[str, str]:
        """Upload to Instagram Reels via web. Instagram frequently changes UI; this is a best-effort flow.
        """
        if not Path(video_path).exists():
            raise UploadError("video_path does not exist")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            context = browser.new_context()
            if cookies_path and os.path.exists(cookies_path):
                context = browser.new_context(storage_state=cookies_path)
            page = context.new_page()
            try:
                page.goto("https://www.instagram.com/create/style/", timeout=30000)
                # upload input
                try:
                    page.wait_for_selector("input[type=file]", timeout=15000)
                    page.set_input_files("input[type=file]", video_path)
                except PlaywrightTimeoutError:
                    raise UploadError("Upload input not found on Instagram create page. Possibly blocked or UI changed.")

                # set caption
                try:
                    page.fill("textarea", caption)
                except Exception:
                    logger.warning("Could not set caption; continuing")

                # click share
                try:
                    page.click("button:has-text('Share')", timeout=10000)
                except Exception as e:
                    raise UploadError(f"Failed to click Share button: {e}")

                # wait for success
                try:
                    page.wait_for_selector("text=Your reel was shared", timeout=60000)
                except PlaywrightTimeoutError:
                    logger.warning("Share confirmation not found; returning current URL")

                storage_path = os.path.join(self.download_dir, f"ig_storage_{int(time.time())}.json")
                context.storage_state(path=storage_path)
                return {"post_url": page.url, "cookies": storage_path}
            finally:
                try:
                    context.close()
                    browser.close()
                except Exception:
                    pass

# Example usage (manual):
# uploader = SocialUploader(headless=False)
# uploader.upload_tiktok('/path/to/video.mp4', caption='Test from automation')
