"""Simple runner for `SocialUploader` used during local testing.

Usage:
  python backend/scripts/run_upload.py --video /path/to/video.mp4 --platform tiktok --headless False

Note: Playwright must be installed and `playwright install chromium` executed beforehand.
"""
import argparse
import logging
from backend.app.services.social_uploader import SocialUploader, UploadError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("run_upload")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--platform", default="tiktok")
    parser.add_argument("--caption", default="")
    parser.add_argument("--headless", type=lambda x: x.lower() in ("1","true","yes"), default=True)
    parser.add_argument("--cookies", default=None)
    args = parser.parse_args()

    uploader = SocialUploader(headless=args.headless)
    try:
        try:
            if args.platform.lower() == 'tiktok':
                res = uploader.upload_tiktok(args.video, caption=args.caption, cookies_path=args.cookies)
            else:
                res = uploader.upload_instagram_reel(args.video, caption=args.caption, cookies_path=args.cookies)
            logger.info("Upload result: %s", res)
        except UploadError as e:
            logger.error("Upload failed: %s", e)
        except Exception as e:
            logger.exception("Unexpected upload error: %s", e)
    finally:
        pass

if __name__ == '__main__':
    main()
