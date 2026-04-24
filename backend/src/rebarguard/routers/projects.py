"""Projects API — upload approved structural drawing, parse into StructuralPlan."""

from __future__ import annotations

import asyncio
import shutil
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from rebarguard.agents.plan_parser import PlanParserAgent
from rebarguard.schemas import PlanParseResult, Project

router = APIRouter()

# In-memory project store.
#
# `_STORE_LOCK` guards mutation so concurrent uploads + seeder calls don't race on
# `_STORE[id] = proj`. Python dict assignment is atomic under the GIL but a lock makes
# the contract explicit and survives a future move to a multi-worker uvicorn setup.
# (Supabase persistence is deferred — see task #27.)
_STORE: dict[str, Project] = {}
_STORE_LOCK = asyncio.Lock()

# 50 MB is comfortably above a real structural drawing PDF and well below any
# reasonable hackathon-demo memory budget.
_MAX_PDF_BYTES = 50 * 1024 * 1024


@router.post("", response_model=Project)
async def create_project(pdf: UploadFile = File(...)) -> Project:
    if not pdf.filename or not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "PDF file required")

    # User-supplied filenames are not trusted. Generate a random name and keep the
    # original only as reference in logs / audit.
    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-"))
    tmp_path = tmp_dir / f"{uuid4().hex}.pdf"

    total = 0
    with tmp_path.open("wb") as f:
        while True:
            chunk = await pdf.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > _MAX_PDF_BYTES:
                raise HTTPException(
                    413,
                    f"PDF exceeds {_MAX_PDF_BYTES // (1024 * 1024)} MB upload limit",
                )
            f.write(chunk)

    try:
        agent = PlanParserAgent()
        result: PlanParseResult = await agent.run(tmp_path)
    except Exception as e:
        raise HTTPException(500, f"plan parse failed: {e}") from e
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    proj = Project(plan=result.plan)
    async with _STORE_LOCK:
        _STORE[str(proj.id)] = proj
    return proj


@router.get("", response_model=list[Project])
async def list_projects() -> list[Project]:
    async with _STORE_LOCK:
        return list(_STORE.values())


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    async with _STORE_LOCK:
        proj = _STORE.get(project_id)
    if not proj:
        raise HTTPException(404, "project not found")
    return proj
