"""Inspections API — receive site photos, stream the 7-agent debate over SSE."""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from rebarguard.routers.projects import _STORE
from rebarguard.schemas import AgentMessage
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
    column_id: Annotated[str, Form()],
    city: Annotated[str | None, Form()] = None,
    soil_class: Annotated[str | None, Form()] = None,
    floors: Annotated[int, Form()] = 5,
    photos: list[UploadFile] = File(...),
    closeup: UploadFile | None = File(None),
    cover: UploadFile | None = File(None),
):
    project = _STORE.get(project_id)
    if not project:
        raise HTTPException(404, "project not found")

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
        column_id=column_id,
        site_photos=photo_paths,
        closeup_photo=closeup_path,
        cover_photo=cover_path,
        city=city,
        soil_class=soil_class,
        floors=floors,
    )
    return EventSourceResponse(_stream(job))
