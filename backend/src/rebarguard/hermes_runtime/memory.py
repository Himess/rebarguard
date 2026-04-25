"""Per-parcel session memory — Hermes Agent's `--resume` primitive.

Stores the last `session_id` Hermes emitted for a given parcel so the next
inspection of the same building literally resumes the prior conversation. The
Moderator + Belediye agents see the previous verdict in their context; if a
parcel was rejected last week and the contractor returns with new photos, the
agents start with that history.

State lives at `${HERMES_HOME}/rebarguard-sessions.json` so it persists on the
Fly volume across redeploys (the OAuth token's neighbour).
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path

_LOCK = threading.Lock()


def _store_path() -> Path:
    home = Path(os.environ.get("HERMES_HOME", str(Path.home() / ".hermes")))
    return home / "rebarguard-sessions.json"


def _read_all() -> dict[str, str]:
    p = _store_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text("utf-8")) or {}
    except (OSError, json.JSONDecodeError):
        return {}


def _write_all(data: dict[str, str]) -> None:
    p = _store_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
    tmp.replace(p)


def get_last_session(parcel_tag: str) -> str | None:
    """Return the most recent session_id for this parcel, or None."""
    if not parcel_tag:
        return None
    with _LOCK:
        return _read_all().get(parcel_tag)


def remember_session(parcel_tag: str, session_id: str) -> None:
    """Persist this session_id as the new most-recent for the parcel."""
    if not parcel_tag or not session_id:
        return
    with _LOCK:
        data = _read_all()
        data[parcel_tag] = session_id
        _write_all(data)


__all__ = ["get_last_session", "remember_session"]
