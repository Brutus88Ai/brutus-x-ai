# backend/app/main.py
# FastAPI entrypoint with minimal routes for health and starting trend-scout

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from .db import SessionLocal, engine
from . import models
from .services.trends import TrendScout
from .services.grok_automator import GrokAutomator, AuthenticationError, CaptchaError
from .services.social_uploader import SocialUploader, UploadError
import os

# create database tables if not present (development convenience)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ViralGen API")

class Health(BaseModel):
    status: str

@app.get("/health", response_model=Health)
def health():
    return {"status": "ok"}

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Example endpoint to create a job (barebones)
class CreateJobRequest(BaseModel):
    owner_id: int
    script_prompt: str

@app.post("/jobs")
def create_job(req: CreateJobRequest, db=Depends(get_db)):
    # simple create - in production validate owner and permissions
    job = models.Job(owner_id=req.owner_id, metadata={"prompt": req.script_prompt})
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id, "status": job.status}


@app.get("/trends/top")
def top_trend(q: str = "ai", proxies: str = None):
    """Return a top related query for the provided q (comma-separated seeds allowed).

    Example self-correction behavior: if TrendScout cannot fetch from Google Trends (e.g. 429),
    it will retry with exponential backoff and proxy rotation. If all attempts fail, we return
    a safe default trend string.
    """
    seeds = [s.strip() for s in q.split(",") if s.strip()]
    proxy_list = proxies.split(",") if proxies else None
    scout = TrendScout(proxies=proxy_list)
    top = scout.safe_fetch_top_trend(seeds)
    if not top:
        # fallback default
        return {"trend": "KI Revolution 2026"}
    return {"trend": top}


# --- Automation endpoints (Grok + Social uploads) ---
class GrokRequest(BaseModel):
    prompt: str
    headless: bool = True
    proxies: Optional[str] = None

@app.post("/automation/grok")
def automation_grok(req: GrokRequest):
    """Trigger Grok imagine flow. Blocking call — in production run this as a background job.

    Returns local download path and remote URL when available.
    """
    proxy_list = req.proxies.split(",") if req.proxies else None
    automator = GrokAutomator(headless=req.headless, proxies=proxy_list)
    try:
        # attempt login if credentials are set or provided via env
        if automator.username and automator.password:
            automator.login()
        result = automator.imagine(req.prompt)
        return {"ok": True, "result": result}
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except CaptchaError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grok error: {e}")
    finally:
        try:
            automator.close()
        except Exception:
            pass


class UploadRequest(BaseModel):
    video_path: str
    caption: Optional[str] = ""
    platform: Optional[str] = "tiktok"
    cookies_path: Optional[str] = None
    headless: bool = True

@app.post("/automation/upload")
def automation_upload(req: UploadRequest):
    """Upload a video to a social platform via the SocialUploader.

    Returns the post URL and saved cookie path.
    """
    uploader = SocialUploader(headless=req.headless)
    try:
        if req.platform.lower() == "tiktok":
            res = uploader.upload_tiktok(req.video_path, caption=req.caption or "", cookies_path=req.cookies_path)
        elif req.platform.lower() in ("instagram", "ig", "reel", "reels"):
            res = uploader.upload_instagram_reel(req.video_path, caption=req.caption or "", cookies_path=req.cookies_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported platform")
        return {"ok": True, "result": res}
    except UploadError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {e}")

