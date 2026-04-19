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
    except Exception:  # noqa: BLE001
        return None


@router.post("/analyze", response_model=QuickScanResult)
async def analyze(photo: UploadFile = File(...)) -> QuickScanResult:
    if not photo.filename:
        raise HTTPException(400, "photo required")

    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-quick-"))
    tmp_path = tmp_dir / photo.filename
    with tmp_path.open("wb") as f:
        shutil.copyfileobj(photo.file, f)

    settings = get_settings()
    kimi = get_kimi_client()
    t0 = time.perf_counter()

    try:
        prompt = build_quick_scan_prompt()
        parsed = await kimi.analyze_image(tmp_path, prompt, max_tokens=1400)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Kimi call failed: {e}") from e

    raw_list: list[dict[str, Any]] = []
    if isinstance(parsed, dict):
        items = parsed.get("findings")
        if isinstance(items, list):
            raw_list = [x for x in items if isinstance(x, dict)]
        elif "error" in parsed:
            raise HTTPException(
                500,
                f"Kimi returned an error: {parsed.get('error')} — raw: {str(parsed.get('raw'))[:200]}",
            )

    findings = [f for f in (_coerce_finding(r) for r in raw_list) if f is not None]
    elapsed = time.perf_counter() - t0

    return QuickScanResult(
        findings=findings,
        elapsed_s=round(elapsed, 2),
        model=settings.hermes_agentic_model,
    )
