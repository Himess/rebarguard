"""Quick-scan API — single-photo analysis without a project plan.

Sends the uploaded image to Kimi K2.5 via the subscription-backed Hermes Agent CLI
(or Moonshot fallback) with `QUICK_SCAN_PROMPT`, returns a normalized findings list with
bounding boxes for the UI to annotate.
"""

from __future__ import annotations

import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from rebarguard.config import get_settings
from rebarguard.rag import citation_codes
from rebarguard.vision import get_kimi_client
from rebarguard.vision.prompts import build_quick_scan_prompt

router = APIRouter()


class BoundingBox(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    w: float = Field(ge=0.0, le=1.0)
    h: float = Field(ge=0.0, le=1.0)


class QuickFinding(BaseModel):
    title: str
    severity: Literal["fail", "warn", "info"]
    bbox: BoundingBox
    detail: str = ""
    ref: str | None = None
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class QuickScanResult(BaseModel):
    findings: list[QuickFinding] = Field(default_factory=list)
    elapsed_s: float
    model: str


_WHITELIST = set(citation_codes())


def _validate_ref(raw_ref) -> str | None:
    if not raw_ref:
        return None
    key = " ".join(str(raw_ref).replace("-", " ").split())
    # Case-insensitive exact match, keep the canonical casing
    for code in _WHITELIST:
        if code.lower() == key.lower():
            return code
    return None


def _coerce_finding(raw: dict[str, Any]) -> QuickFinding | None:
    try:
        bbox_raw = raw.get("bbox") or {}
        bbox = BoundingBox(
            x=max(0.0, min(1.0, float(bbox_raw.get("x", 0)))),
            y=max(0.0, min(1.0, float(bbox_raw.get("y", 0)))),
            w=max(0.0, min(1.0, float(bbox_raw.get("w", 0)))),
            h=max(0.0, min(1.0, float(bbox_raw.get("h", 0)))),
        )
        sev = str(raw.get("severity", "info")).lower()
        if sev not in {"fail", "warn", "info"}:
            sev = "info"
        conf_raw = raw.get("confidence", 0.7)
        try:
            conf = max(0.0, min(1.0, float(conf_raw)))
        except (TypeError, ValueError):
            conf = 0.7
        return QuickFinding(
            title=str(raw.get("title", "Finding")).strip() or "Finding",
            severity=sev,  # type: ignore[arg-type]
            bbox=bbox,
            detail=str(raw.get("detail", "")).strip(),
            ref=_validate_ref(raw.get("ref")),
            confidence=conf,
        )
    except Exception:
        return None


_MAX_PHOTO_BYTES = 20 * 1024 * 1024  # 20 MB per photo


@router.post("/analyze", response_model=QuickScanResult)
async def analyze(photo: UploadFile = File(...)) -> QuickScanResult:
    if not photo.filename:
        raise HTTPException(400, "photo required")

    suffix = Path(photo.filename).suffix.lower() or ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
        raise HTTPException(400, f"unsupported image type: {suffix}")

    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-quick-"))
    tmp_path = tmp_dir / f"{uuid4().hex}{suffix}"
    total = 0
    with tmp_path.open("wb") as f:
        while True:
            chunk = await photo.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > _MAX_PHOTO_BYTES:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                raise HTTPException(
                    413,
                    f"photo exceeds {_MAX_PHOTO_BYTES // (1024 * 1024)} MB upload limit",
                )
            f.write(chunk)

    settings = get_settings()
    kimi = get_kimi_client()
    t0 = time.perf_counter()

    try:
        prompt = build_quick_scan_prompt()
        parsed = await kimi.analyze_image(
            tmp_path, prompt, max_tokens=1400, skills=["inspect-rebar"]
        )
    except Exception as e:
        raise HTTPException(500, f"Kimi call failed: {e}") from e
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    raw_list: list[dict[str, Any]] = []
    if isinstance(parsed, dict):
        items = parsed.get("findings")
        if isinstance(items, list):
            raw_list = [x for x in items if isinstance(x, dict)]
        elif "error" in parsed:
            # Graceful degradation: return empty findings instead of 500-ing so the UI can
            # still render the photo with a "no findings / retry" state.
            return QuickScanResult(
                findings=[],
                elapsed_s=round(time.perf_counter() - t0, 2),
                model=settings.hermes_agentic_model,
            )

    findings = [f for f in (_coerce_finding(r) for r in raw_list) if f is not None]
    elapsed = time.perf_counter() - t0

    return QuickScanResult(
        findings=findings,
        elapsed_s=round(elapsed, 2),
        model=settings.hermes_agentic_model,
    )
