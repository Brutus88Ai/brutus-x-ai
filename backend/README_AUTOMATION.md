# Automation Core — Grok & Social Uploads

This document describes how to run and test the Automation Core locally (GrokAutomator and SocialUploader).

Prerequisites
- Python 3.9+
- Install automation deps:

```powershell
pip install -r backend/requirements.txt
# Then install Playwright browsers
playwright install chromium
```

Environment variables
- `GROK_USERNAME` and `GROK_PASSWORD` — optional; provide credentials if automating a logged-in flow.
- `GROK_LOGIN_URL` and `GROK_IMAGINE_URL` — override defaults if needed.
- `GROK_DOWNLOAD_DIR` — optional download directory for media and screenshots.

Quick tests
- Run Grok imagine (example):

```powershell
python backend/scripts/run_grok.py --prompt "A cinematic neon AI revolution 9:16 short" --headless False
```

- Run TikTok upload (example):

```powershell
python backend/scripts/run_upload.py --video "C:\path\to\video.mp4" --platform tiktok --headless False
```

Caveats
- These tools automate third-party websites. They do not bypass CAPTCHAs or protections. If a CAPTCHA is encountered the code will save a screenshot and raise an error for manual handling.
- Playwright and browser automation can be flaky across environments. Use a reproducible container or VM for reliable runs.

Security
- Do not commit credentials. Use your platform's secret manager for production deployments.

