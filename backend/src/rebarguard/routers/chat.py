"""Citizen chat router — multi-turn agent that uses Hermes Agent's `--resume`
session memory natively.

Flow:
1. User sends a message (and optionally a photo) to `POST /api/chat/stream`.
2. We look up the prior `session_id` for the conversation. First turn = none.
3. We call `hermes chat -q "<msg>" -m moonshotai/kimi-k2.6 --provider nous \
   -s citizen-chat --image <path>? -r <prev_session_id>?` via the bridge.
   - `-r` continues the prior conversation; the agent has full context.
   - `-s citizen-chat` preloads the SKILL.md instructions.
   - `--image` attaches the photo to THIS turn only (Hermes handles native vision).
4. The bridge returns `BridgeResult.session_id`; we persist it as the new
   "latest" session for this `conversation_id` so the next turn resumes here.
5. SSE stream emits one or two events: optional "thinking" pulse, then the
   final message text. The frontend strips the `[severity=...; suggest_complaint=...]`
   trailer the SKILL.md instructs the model to emit.

Why a separate router from `/inspections/stream`: that one drives the 9-agent
debate orchestration; this one is a single conversational agent. Keeping them
distinct keeps the two products legible to operators reading the audit log.
"""

from __future__ import annotations

import asyncio
import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from rebarguard.config import get_settings
from rebarguard.hermes_runtime import get_runtime
from rebarguard.hermes_runtime.bridge import HermesCLIBridge
from rebarguard.hermes_runtime.memory import (
    get_last_session,
    remember_session,
)

router = APIRouter()

_MAX_PHOTO_BYTES = 20 * 1024 * 1024
_TRAILER_RE = re.compile(
    r"\s*\[severity=(?P<severity>ok|moderate|high)\s*;\s*"
    r"suggest_complaint=(?P<suggest>true|false)\s*\]\s*$",
    re.IGNORECASE,
)


def _parse_trailer(text: str) -> tuple[str, dict[str, str | bool] | None]:
    """Pop the `[severity=...; suggest_complaint=...]` line the SKILL emits.

    Returns (clean_body, parsed_meta_or_None). If no trailer is found, the
    body is returned untouched and meta is None — frontend falls back to
    severity=moderate/false defaults.
    """
    m = _TRAILER_RE.search(text)
    if not m:
        return text.strip(), None
    body = text[: m.start()].rstrip()
    meta = {
        "severity": m.group("severity").lower(),
        "suggest_complaint": m.group("suggest").lower() == "true",
    }
    return body, meta


def _conversation_tag(conversation_id: str) -> str:
    """Conversation IDs are mapped into the same `--source rebarguard:<tag>` audit
    space the orchestrator uses, so judges can filter the chat sessions out of
    `hermes sessions list --source rebarguard:chat-...`."""
    safe = "".join(
        c if (c.isalnum() or c in {"-", "_"}) else "-" for c in conversation_id.lower()
    ).strip("-")
    return f"chat-{safe or 'unknown'}"


@router.post("/stream")
async def chat_stream(
    message: Annotated[str, Form(min_length=1, max_length=4000)],
    conversation_id: Annotated[str | None, Form()] = None,
    photo: UploadFile | None = File(None),
):
    """Multi-turn citizen chat. Streams Hermes 4 70B responses via SSE.

    First turn: omit `conversation_id` (server generates one and returns it as
    the first SSE event). Subsequent turns: re-send the same `conversation_id`
    so the agent resumes prior context.
    """
    settings = get_settings()
    cid = conversation_id or f"chat-{uuid4().hex[:12]}"
    tag = _conversation_tag(cid)

    # Save the photo (if any) to a temp dir; Hermes' --image flag is
    # per-turn, so we attach only on the turn the user actually sent one.
    tmp_dir: Path | None = None
    photo_path: Path | None = None
    if photo and photo.filename:
        suffix = Path(photo.filename).suffix.lower() or ".jpg"
        if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
            raise HTTPException(400, f"unsupported image type: {suffix}")
        tmp_dir = Path(tempfile.mkdtemp(prefix="rebarguard-chat-"))
        photo_path = tmp_dir / f"{uuid4().hex}{suffix}"
        total = 0
        with photo_path.open("wb") as f:
            while True:
                chunk = await photo.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > _MAX_PHOTO_BYTES:
                    shutil.rmtree(tmp_dir, ignore_errors=True)
                    raise HTTPException(
                        413,
                        f"photo exceeds {_MAX_PHOTO_BYTES // (1024 * 1024)} MB",
                    )
                f.write(chunk)

    runtime = get_runtime()
    if not isinstance(runtime, HermesCLIBridge):
        if tmp_dir is not None:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(
            500, "chat requires HERMES_RUNTIME=cli (subscription path)"
        )

    prior_session = get_last_session(tag)

    async def gen():
        try:
            yield {
                "event": "meta",
                "data": json.dumps(
                    {
                        "conversation_id": cid,
                        "session_resumed": bool(prior_session),
                        "model": settings.hermes_agentic_model,
                    }
                ),
            }
            yield {"event": "thinking", "data": json.dumps({"phase": "agent"})}

            try:
                result = await runtime.chat(
                    [{"role": "user", "content": message}],
                    model=settings.hermes_agentic_model,
                    image=photo_path,
                    json_mode=False,
                    skills=["citizen-chat"],
                    session_tag=tag,
                    resume_session_id=prior_session,
                )
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)[:500]}),
                }
                return

            if result.session_id:
                remember_session(tag, result.session_id)

            body, meta = _parse_trailer(result.content or "")
            yield {
                "event": "message",
                "data": json.dumps(
                    {
                        "conversation_id": cid,
                        "session_id": result.session_id,
                        "content": body,
                        "meta": meta or {"severity": "moderate", "suggest_complaint": False},
                        "model": result.model,
                    },
                    ensure_ascii=False,
                ),
            }
            yield {"event": "done", "data": "{}"}
        finally:
            if tmp_dir is not None:
                shutil.rmtree(tmp_dir, ignore_errors=True)

    return EventSourceResponse(gen())


@router.delete("/conversations/{conversation_id}")
async def reset_conversation(conversation_id: str) -> dict:
    """Forget the saved session for this conversation. Next message starts fresh."""
    from rebarguard.hermes_runtime import memory as memory_mod

    tag = _conversation_tag(conversation_id)
    # The memory module doesn't expose a delete primitive; use the stored
    # dict directly. Safe because the global lock is acquired by helpers.
    with memory_mod._LOCK:
        data = memory_mod._read_all()
        if tag in data:
            del data[tag]
            memory_mod._write_all(data)
            return {"reset": True, "conversation_id": conversation_id}
    return {"reset": False, "conversation_id": conversation_id}


# --- background asyncio import (lazy so test discovery doesn't block) ---
_ = asyncio  # placate linters that flag the import as unused; we use it indirectly
