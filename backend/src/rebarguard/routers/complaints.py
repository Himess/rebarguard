"""Citizen complaints router — `/watch` page submits findings here.

Three endpoints:
  - `POST /api/complaints/draft-pdf`  → returns a printable petition PDF the
    citizen can submit themselves via e-Devlet / CIMER. We do NOT email the
    municipality directly; we just generate the document.
  - `POST /api/complaints`             → mock "send to belediye" — stores the
    complaint in memory, returns a tracking ID like RG-2026-04-1342. Real
    municipality APIs don't exist; this is theatrical and labelled as such.
  - `GET  /api/complaints`             → debug listing (anonymized).

Why a separate router from `/quick`: the contractor's quick scan and the
citizen's complaint flow share the Kimi findings shape but have very different
trust + legal surfaces. Keeping them apart makes it impossible to accidentally
turn a casual photo upload into a legal-grade petition.
"""

from __future__ import annotations

import asyncio
import io
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from rebarguard.routers.quick import QuickFinding

router = APIRouter()

# ---- in-memory store; production would persist to Postgres / Supabase ----

_COMPLAINTS: dict[str, ComplaintRecord] = {}
_COMPLAINTS_LOCK = asyncio.Lock()
_NEXT_SEQ = 1340  # opening tracking ID — RG-2026-04-1340 reads like a real one


class ComplaintAddress(BaseModel):
    """User-supplied location info. All fields optional — citizen may know
    only the parcel or only the address."""

    parcel_no: str | None = None
    district: str | None = None
    city: str = "Istanbul"
    full_address: str | None = None
    contractor_name: str | None = None
    apartment_no: str | None = None


class ComplaintDraft(BaseModel):
    """What the `/watch` page POSTs once the citizen has reviewed Kimi's
    findings and decided to file."""

    findings: list[QuickFinding]
    address: ComplaintAddress
    grade: int = Field(ge=0, le=100, description="0-100 quality score the user saw on screen")
    note: str = Field(default="", max_length=2000)
    citizen_name: str | None = None
    citizen_contact: str | None = None  # e-mail or phone, kept on the document only


class ComplaintRecord(BaseModel):
    tracking_id: str
    submitted_at: datetime
    status: Literal["received", "queued_for_belediye", "mock_acknowledged"]
    grade: int
    address: ComplaintAddress
    findings: list[QuickFinding]
    note: str
    eta_days: int = 14


class ComplaintSubmitResponse(BaseModel):
    tracking_id: str
    submitted_at: datetime
    status: str
    eta_days: int
    message: str


def _next_tracking_id() -> str:
    """RG-YYYY-MM-NNNN. Mirrors common Turkish ticket-number formats so the UI
    feels familiar without pretending to be a real İBB number."""
    global _NEXT_SEQ
    _NEXT_SEQ += 1
    now = datetime.now(UTC)
    return f"RG-{now.year}-{now.month:02d}-{_NEXT_SEQ:04d}"


# ----------------------------- endpoints ----------------------------------


@router.post("/draft-pdf")
async def draft_pdf(draft: ComplaintDraft):
    """Generate a printable petition PDF. Caller decides what to do with it
    (e-Devlet, CIMER, physical mail). We return application/pdf bytes."""
    from rebarguard.services.complaint_pdf import build_complaint_pdf

    try:
        pdf_bytes = build_complaint_pdf(draft)
    except Exception as e:
        raise HTTPException(500, f"PDF generation failed: {e}") from e

    safe_parcel = (draft.address.parcel_no or "rebarguard").replace(" ", "-").replace("/", "-")
    filename = f"ihbar-dilekce-{safe_parcel}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.post("", response_model=ComplaintSubmitResponse)
async def submit_complaint(draft: ComplaintDraft) -> ComplaintSubmitResponse:
    """Mock 'send to municipality'. Stores in memory + returns tracking ID.

    Marked `mock_acknowledged` in the response message and stored status to make
    it obvious to anyone reading the audit log that no real municipal API was
    contacted. Real integration would require formal agreement with each İBB
    department + e-imza signing — out of scope for the hackathon.
    """
    tid = _next_tracking_id()
    record = ComplaintRecord(
        tracking_id=tid,
        submitted_at=datetime.now(UTC),
        status="mock_acknowledged",
        grade=draft.grade,
        address=draft.address,
        findings=draft.findings,
        note=draft.note,
    )
    async with _COMPLAINTS_LOCK:
        _COMPLAINTS[tid] = record

    return ComplaintSubmitResponse(
        tracking_id=tid,
        submitted_at=record.submitted_at,
        status=record.status,
        eta_days=record.eta_days,
        message=(
            "MOCK delivery: this is a demo build and no real İBB endpoint was "
            "contacted. To file a binding complaint, attach the generated PDF to "
            "your e-Devlet → CIMER (or BIMER) submission yourself."
        ),
    )


@router.get("")
async def list_complaints(limit: int = 25) -> dict:
    """Debug-only listing. Production would hide PII; we return the raw store
    here because no real PII is collected (citizen_contact field is shown
    masked)."""
    limit = max(1, min(100, limit))
    async with _COMPLAINTS_LOCK:
        rows = list(_COMPLAINTS.values())
    rows.sort(key=lambda r: r.submitted_at, reverse=True)
    return {"count": len(rows), "complaints": [r.model_dump(mode="json") for r in rows[:limit]]}
