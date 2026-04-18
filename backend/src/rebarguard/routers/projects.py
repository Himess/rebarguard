"""Projects API — upload approved structural drawing, parse into StructuralPlan."""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from rebarguard.agents.plan_parser import PlanParserAgent
from rebarguard.schemas import PlanParseResult, Project

router = APIRouter()

_STORE: dict[str, Project] = {}


@router.post("", response_model=Project)
async def create_project(pdf: UploadFile = File(...)) -> Project:
    if not pdf.filename or not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "PDF file required")

    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-"))
    tmp_path = tmp_dir / pdf.filename
    with tmp_path.open("wb") as f:
        shutil.copyfileobj(pdf.file, f)

    try:
        agent = PlanParserAgent()
        result: PlanParseResult = await agent.run(tmp_path)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"plan parse failed: {e}") from e

    proj = Project(plan=result.plan)
    _STORE[str(proj.id)] = proj
    return proj


@router.get("", response_model=list[Project])
async def list_projects() -> list[Project]:
    return list(_STORE.values())


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    proj = _STORE.get(project_id)
    if not proj:
        raise HTTPException(404, "project not found")
    return proj
