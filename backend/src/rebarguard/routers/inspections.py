"""Inspections API — site photos in, 9-agent debate streamed over SSE."""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from rebarguard.routers.projects import _STORE, _STORE_LOCK
from rebarguard.schemas import AgentMessage, ElementType, InspectionPhase
from rebarguard.services.inspection import InspectionJob, InspectionOrchestrator

router = APIRouter()

_MAX_PHOTO_BYTES = 20 * 1024 * 1024  # 20 MB per photo
_MAX_PHOTOS = 12


async def _stream(job: InspectionJob, tmp_dir: Path):
    try:
        orchestrator = InspectionOrchestrator()
        async for msg in orchestrator.run(job):
            yield {"event": msg.agent.value, "data": _serialize(msg)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _serialize(m: AgentMessage) -> str:
    return json.dumps(m.model_dump(mode="json"), ensure_ascii=False)


async def _save_upload(src: UploadFile, dest_dir: Path) -> Path:
    suffix = Path(src.filename or "photo.jpg").suffix.lower() or ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
        raise HTTPException(400, f"unsupported image type: {suffix}")
    dest = dest_dir / f"{uuid4().hex}{suffix}"
    total = 0
    with dest.open("wb") as f:
        while True:
            chunk = await src.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > _MAX_PHOTO_BYTES:
                raise HTTPException(
                    413,
                    f"photo exceeds {_MAX_PHOTO_BYTES // (1024 * 1024)} MB upload limit",
                )
            f.write(chunk)
    return dest


@router.post("/stream")
async def inspect_stream(
    project_id: Annotated[str, Form()],
    element_id: Annotated[str, Form()],
    element_type: Annotated[str, Form()] = "column",
    stage: Annotated[str, Form()] = "other",
    photos: list[UploadFile] = File(...),
    closeup: UploadFile | None = File(None),
    cover: UploadFile | None = File(None),
):
    async with _STORE_LOCK:
        project = _STORE.get(project_id)
    if not project:
        raise HTTPException(404, "project not found")

    try:
        et = ElementType(element_type)
    except ValueError as e:
        raise HTTPException(400, f"invalid element_type: {element_type}") from e

    try:
        st = InspectionPhase(stage)
    except ValueError:
        st = InspectionPhase.OTHER

    element = project.plan.find_element(element_id)
    if element is None:
        raise HTTPException(404, f"element {element_id} not in project")

    if not photos:
        raise HTTPException(400, "at least one photo required")
    if len(photos) > _MAX_PHOTOS:
        raise HTTPException(413, f"too many photos ({len(photos)} > {_MAX_PHOTOS})")

    tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-insp-"))
    try:
        photo_paths = [await _save_upload(p, tmp_dir) for p in photos]
        closeup_path = (
            await _save_upload(closeup, tmp_dir) if closeup and closeup.filename else None
        )
        cover_path = (
            await _save_upload(cover, tmp_dir) if cover and cover.filename else None
        )
    except HTTPException:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise

    job = InspectionJob(
        plan=project.plan,
        element_id=element_id,
        element_type=et,
        stage=st,
        site_photos=photo_paths,
        closeup_photo=closeup_path,
        cover_photo=cover_path,
    )
    return EventSourceResponse(_stream(job, tmp_dir))
