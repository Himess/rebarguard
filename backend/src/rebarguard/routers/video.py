"""Video analysis router — Kimi K2.6 walks through a 30-90 s site video and
emits time-stamped findings.

Why this is a separate router (and a separate client path) from `/api/quick`:
the Hermes Agent CLI we use for image vision exposes only `--image`, not
`--video`. Nous Portal's subscription proxy does not relay video either. So
video analysis bypasses the subscription path and calls Moonshot's direct
OpenAI-compatible API. Cost is per-token, paid out of `MOONSHOT_API_KEY`. We
keep the contractor / citizen image flows on the free Hermes path.

Demo-fallback: if `MOONSHOT_API_KEY` isn't set (the default in this repo
because the hackathon is running on the Nous Portal subscription), the
endpoint returns a curated `data/demo_replay/video_fistik.json` transcript
so the UI can still render. The frontend reflects the `model_used` field in
the response so judges can tell live Kimi from canned replay.

The actual API shape (verified against Moonshot docs):

    POST {moonshot_base_url}/chat/completions
    {
      "model": "kimi-k2.6",
      "messages": [{
        "role": "user",
        "content": [
          {"type": "video_url", "video_url": {"url": "data:video/mp4;base64,..."}},
          {"type": "text", "text": "<our prompt>"}
        ]
      }],
      "response_format": {"type": "json_object"}
    }
"""

from __future__ import annotations

import base64
import json
import shutil
import tempfile
import time
from importlib import resources
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from rebarguard.config import get_settings
from rebarguard.rag import citation_codes
from rebarguard.vision.prompts import build_video_scan_prompt

router = APIRouter()

# Moonshot says video_url accepts base64 OR file references; for a 30-90s
# clip at moderate quality we land around 5-15 MB of MP4. The 25 MB cap is a
# safety rail — anything bigger we reject at the door rather than push to the
# Moonshot API and burn tokens.
_MAX_VIDEO_BYTES = 25 * 1024 * 1024
_ACCEPTED_SUFFIXES = {".mp4", ".m4v", ".mov", ".webm"}
_MIME_BY_SUFFIX = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}


class VideoFinding(BaseModel):
    timestamp_s: float = Field(ge=0.0)
    title: str
    severity: str = Field(pattern="^(fail|warn|info)$")
    detail: str = ""
    ref: str | None = None
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class VideoScanResult(BaseModel):
    findings: list[VideoFinding] = Field(default_factory=list)
    duration_s: float | None = None
    summary_en: str = ""
    summary_tr: str = ""
    elapsed_s: float
    model: str
    source: str  # "live" | "demo_fallback"


_WHITELIST = set(citation_codes())


def _validate_ref(raw_ref) -> str | None:
    if not raw_ref:
        return None
    key = " ".join(str(raw_ref).replace("-", " ").split())
    for code in _WHITELIST:
        if code.lower() == key.lower():
            return code
    return None


def _coerce_finding(raw: dict[str, Any]) -> VideoFinding | None:
    try:
        ts = raw.get("timestamp_s")
        if not isinstance(ts, (int, float)):
            return None
        sev = str(raw.get("severity", "info")).lower()
        if sev not in {"fail", "warn", "info"}:
            sev = "info"
        conf_raw = raw.get("confidence", 0.7)
        try:
            conf = max(0.0, min(1.0, float(conf_raw)))
        except (TypeError, ValueError):
            conf = 0.7
        return VideoFinding(
            timestamp_s=max(0.0, float(ts)),
            title=str(raw.get("title", "Finding")).strip() or "Finding",
            severity=sev,
            detail=str(raw.get("detail", "")).strip(),
            ref=_validate_ref(raw.get("ref")),
            confidence=conf,
        )
    except Exception:
        return None


def _load_demo_fallback() -> dict[str, Any]:
    """Return the canned video transcript shipped alongside the package."""
    try:
        with resources.as_file(
            resources.files("rebarguard").joinpath("data/demo_replay/video_fistik.json")
        ) as p:
            return json.loads(Path(p).read_text("utf-8"))
    except (FileNotFoundError, ModuleNotFoundError, json.JSONDecodeError):
        return {"findings": [], "duration_s": None, "summary_en": "", "summary_tr": ""}


def _coerce_envelope(raw: dict[str, Any]) -> dict[str, Any]:
    items = raw.get("findings") or []
    findings: list[VideoFinding] = [
        f for f in (_coerce_finding(x) for x in items if isinstance(x, dict)) if f is not None
    ]
    findings.sort(key=lambda f: f.timestamp_s)
    duration = raw.get("duration_s")
    duration_f = float(duration) if isinstance(duration, (int, float)) else None
    return {
        "findings": [f.model_dump() for f in findings],
        "duration_s": duration_f,
        "summary_en": str(raw.get("summary_en") or "").strip(),
        "summary_tr": str(raw.get("summary_tr") or "").strip(),
    }


@router.post("/analyze", response_model=VideoScanResult)
async def analyze_video(video: UploadFile = File(...)) -> VideoScanResult:
    """Stream a video to Kimi K2.6 (Moonshot direct API) and return time-stamped findings.

    No Moonshot API key configured → returns the curated demo transcript with
    `source="demo_fallback"`. Frontend treats this as a real-looking response
    so the UI still demos cleanly without paid API access.
    """
    if not video.filename:
        raise HTTPException(400, "video required")

    suffix = Path(video.filename).suffix.lower() or ".mp4"
    if suffix not in _ACCEPTED_SUFFIXES:
        raise HTTPException(400, f"unsupported video type: {suffix}")

    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-video-"))
    tmp_path = tmp_dir / f"{uuid4().hex}{suffix}"
    total = 0
    try:
        with tmp_path.open("wb") as f:
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > _MAX_VIDEO_BYTES:
                    raise HTTPException(
                        413,
                        f"video exceeds {_MAX_VIDEO_BYTES // (1024 * 1024)} MB upload limit",
                    )
                f.write(chunk)

        settings = get_settings()
        t0 = time.perf_counter()

        if not settings.moonshot_api_key:
            # No paid API configured — return canned transcript so the demo
            # video can still play through this route.
            envelope = _coerce_envelope(_load_demo_fallback())
            return VideoScanResult(
                **envelope,
                elapsed_s=round(time.perf_counter() - t0, 2),
                model=settings.kimi_video_model,
                source="demo_fallback",
            )

        b64 = base64.b64encode(tmp_path.read_bytes()).decode("ascii")
        mime = _MIME_BY_SUFFIX.get(suffix, "video/mp4")
        prompt = build_video_scan_prompt()

        client = AsyncOpenAI(
            api_key=settings.moonshot_api_key,
            base_url=settings.moonshot_base_url,
        )
        try:
            resp = await client.chat.completions.create(
                model=settings.kimi_video_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "video_url",
                                "video_url": {"url": f"data:{mime};base64,{b64}"},
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                max_tokens=2200,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
        except Exception as e:
            raise HTTPException(502, f"Moonshot video call failed: {e}") from e

        text = (resp.choices[0].message.content or "").strip()
        try:
            raw = json.loads(text) if text else {}
        except json.JSONDecodeError:
            raw = {}
        envelope = _coerce_envelope(raw)
        return VideoScanResult(
            **envelope,
            elapsed_s=round(time.perf_counter() - t0, 2),
            model=settings.kimi_video_model,
            source="live",
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.get("/demo")
async def video_demo() -> VideoScanResult:
    """Returns the canned demo transcript without uploading a file.
    The frontend uses this when the user clicks 'Try with the sample clip'."""
    settings = get_settings()
    envelope = _coerce_envelope(_load_demo_fallback())
    return VideoScanResult(
        **envelope,
        elapsed_s=0.0,
        model=settings.kimi_video_model,
        source="demo_fallback",
    )
