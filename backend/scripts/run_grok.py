"""Simple runner for `GrokAutomator` used during local testing.

Usage:
  python backend/scripts/run_grok.py --prompt "A short cinematic AI video" --headless True

This script only performs a dry-run if the browser dependencies are not installed. It prints errors for developer inspection.
"""
import argparse
import logging
from backend.app.services.grok_automator import GrokAutomator, AuthenticationError, CaptchaError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("run_grok")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--headless", type=lambda x: x.lower() in ("1","true","yes"), default=True)
    parser.add_argument("--proxies", default=None, help="Optional comma-separated proxy list")
    args = parser.parse_args()

    proxy_list = args.proxies.split(",") if args.proxies else None
    automator = GrokAutomator(headless=args.headless, proxies=proxy_list)
    try:
        try:
            if automator.username and automator.password:
                automator.login()
        except AuthenticationError as e:
            logger.error("Authentication failed: %s", e)
            return

        try:
            res = automator.imagine(args.prompt)
            logger.info("Imagine result: %s", res)
        except CaptchaError as e:
            logger.error("Captcha encountered: %s", e)
        except Exception as e:
            logger.exception("Grok imagine failed: %s", e)
    finally:
        automator.close()

if __name__ == '__main__':
    main()
