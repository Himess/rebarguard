"""Inspections API — site photos in, 7-agent debate streamed over SSE."""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from rebarguard.routers.projects import _STORE
from rebarguard.schemas import AgentMessage, ElementType
from rebarguard.services.inspection import InspectionJob, InspectionOrchestrator

router = APIRouter()


async def _stream(job: InspectionJob):
    orchestrator = InspectionOrchestrator()
    async for msg in orchestrator.run(job):
        yield {"event": msg.agent.value, "data": _serialize(msg)}


def _serialize(m: AgentMessage) -> str:
    return json.dumps(m.model_dump(mode="json"), ensure_ascii=False)


@router.post("/stream")
async def inspect_stream(
    project_id: Annotated[str, Form()],
    element_id: Annotated[str, Form()],
    element_type: Annotated[str, Form()] = "column",
    photos: list[UploadFile] = File(...),
    closeup: UploadFile | None = File(None),
    cover: UploadFile | None = File(None),
):
    project = _STORE.get(project_id)
    if not project:
        raise HTTPException(404, "project not found")

    try:
        et = ElementType(element_type)
    except ValueError as e:
        raise HTTPException(400, f"invalid element_type: {element_type}") from e

    element = project.plan.find_element(element_id)
    if element is None:
        raise HTTPException(404, f"element {element_id} not in project")

    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-insp-"))
    photo_paths: list[Path] = []
    for up in photos:
        dest = tmp_dir / (up.filename or "photo.jpg")
        with dest.open("wb") as f:
            shutil.copyfileobj(up.file, f)
        photo_paths.append(dest)

    closeup_path: Path | None = None
    if closeup and closeup.filename:
        closeup_path = tmp_dir / closeup.filename
        with closeup_path.open("wb") as f:
            shutil.copyfileobj(closeup.file, f)

    cover_path: Path | None = None
    if cover and cover.filename:
        cover_path = tmp_dir / cover.filename
        with cover_path.open("wb") as f:
            shutil.copyfileobj(cover.file, f)

    job = InspectionJob(
        plan=project.plan,
        element_id=element_id,
        element_type=et,
        site_photos=photo_paths,
        closeup_photo=closeup_path,
        cover_photo=cover_path,
    )
    return EventSourceResponse(_stream(job))
