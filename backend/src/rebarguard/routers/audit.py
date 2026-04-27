"""Audit-log read-only API.

Surfaces the JSONL trail that the Hermes lifecycle hooks (declared in
`backend/hermes-config/cli-config.yaml`) write to `/data/hermes/audit-log.jsonl`.
This is the public-facing proof that the framework primitives we claim — hooks,
session tagging, model attribution — actually fired in production. The `/audit`
frontend page reads from here.

Read-only by design: nobody should be able to mutate the audit trail through
the API. The hooks themselves are the only writers.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

# Allow override for local dev (tests can point at an empty file).
_DEFAULT_LOG_PATH = Path(
    os.environ.get("REBARGUARD_AUDIT_LOG", "/data/hermes/audit-log.jsonl")
)


def _read_recent(limit: int, log_path: Path | None = None) -> list[dict[str, Any]]:
    """Tail-read the JSONL file. We don't load the whole file because audit logs
    grow unbounded; we only need the last N lines for the dashboard."""
    p = log_path or _DEFAULT_LOG_PATH
    if not p.exists():
        return []
    # Simple tail implementation — fine for log files under a few MB.
    try:
        with p.open("rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            chunk_size = 64 * 1024
            data = b""
            position = size
            while position > 0 and data.count(b"\n") <= limit:
                read = min(chunk_size, position)
                position -= read
                f.seek(position)
                data = f.read(read) + data
            text = data.decode("utf-8", errors="replace")
    except OSError as e:
        raise HTTPException(500, f"audit log unreadable: {e}") from e

    rows: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            # malformed row — drop it but don't fail the request
            continue
    return rows[-limit:][::-1]  # most recent first


@router.get("/log")
async def audit_log(
    limit: int = Query(50, ge=1, le=500),
    event: str | None = Query(None, description="Filter by event name"),
) -> dict[str, Any]:
    """Returns the most recent audit-log entries. Hook events:
    - `on_session_start`     · session opens (model + cwd)
    - `on_session_finalize`  · session closes (verdict written)
    - `post_llm_call`        · every LLM call that matched a tracked skill
    """
    rows = _read_recent(limit)
    if event:
        rows = [r for r in rows if r.get("event") == event]
    summary: dict[str, int] = {}
    for r in rows:
        e = str(r.get("event", "unknown"))
        summary[e] = summary.get(e, 0) + 1
    return {
        "log_path": str(_DEFAULT_LOG_PATH),
        "count": len(rows),
        "summary": summary,
        "rows": rows,
    }
