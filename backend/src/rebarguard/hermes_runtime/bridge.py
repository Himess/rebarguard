"""Hermes Agent CLI bridge.

Design goals:
- Minimal surface: `chat(messages, model=...) -> str/dict`
- Compatible with our existing agent code (`HermesClient.complete` et al).
- Works on Windows by invoking `wsl` transparently when `HERMES_CLI_VIA_WSL=true`.
- Timeouts + retries.

The Hermes Agent CLI supports an inline prompt mode we can drive from code. When it
lacks a machine-readable one-shot endpoint, we fall back to a tiny adapter script that
drives `hermes chat` via a JSON-over-stdin/stdout protocol we control.
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from rebarguard.config import Settings, get_settings

RuntimeMode = Literal["direct", "cli", "sdk"]


@dataclass
class BridgeResult:
    content: str
    model: str
    raw: str


class HermesRuntime:
    """Abstract interface the rest of the app uses."""

    mode: RuntimeMode

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        json_mode: bool = False,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> BridgeResult:  # pragma: no cover
        raise NotImplementedError


class HermesCLIBridge(HermesRuntime):
    """Bridge to `hermes` CLI (optionally via WSL).

    Uses Hermes Agent's one-shot run mode. If the CLI doesn't ship a direct one-shot
    API, our helper `scripts/hermes_oneshot.py` (installed inside the WSL venv) will
    accept a JSON payload on stdin and emit a JSON response.
    """

    mode: RuntimeMode = "cli"

    def __init__(self, settings: Settings):
        self._settings = settings
        self._via_wsl = settings.hermes_cli_via_wsl
        self._wsl_distro = settings.hermes_wsl_distro
        self._timeout = settings.hermes_cli_timeout_s

    def _base_cmd(self) -> list[str]:
        # Full command prefix depending on whether we're invoking via WSL.
        if self._via_wsl:
            return ["wsl", "-d", self._wsl_distro, "--", "hermes"]
        if shutil.which("hermes") is None:
            raise RuntimeError(
                "hermes CLI not found on PATH. Either install it natively or set "
                "HERMES_CLI_VIA_WSL=true in .env."
            )
        return ["hermes"]

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        json_mode: bool = False,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> BridgeResult:
        payload: dict[str, Any] = {
            "messages": messages,
            "model": model or self._settings.hermes_agentic_model,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        helper_rel = "backend/src/rebarguard/hermes_runtime/scripts/hermes_oneshot.py"
        helper_path_posix = self._path_for_wsl(helper_rel) if self._via_wsl else helper_rel

        cmd = self._base_cmd() + [
            "run",
            "--script",
            helper_path_posix,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ},
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(json.dumps(payload).encode("utf-8")),
                timeout=self._timeout,
            )
        except asyncio.TimeoutError as e:
            proc.kill()
            raise RuntimeError("hermes CLI timed out") from e

        if proc.returncode != 0:
            raise RuntimeError(
                f"hermes CLI failed (code={proc.returncode}): {stderr.decode('utf-8', 'replace')[:400]}"
            )
        text = stdout.decode("utf-8", "replace").strip()
        try:
            parsed = json.loads(text)
            return BridgeResult(
                content=parsed.get("content", ""),
                model=parsed.get("model", payload["model"]),
                raw=text,
            )
        except json.JSONDecodeError:
            return BridgeResult(content=text, model=payload["model"], raw=text)

    @staticmethod
    def _path_for_wsl(win_relative: str) -> str:
        """Convert a Windows-relative path into a WSL-visible path.

        The project lives at `C:\\Users\\USER\\Desktop\\RebarGuard` which is
        `/mnt/c/Users/USER/Desktop/RebarGuard` inside WSL.
        """
        project_root = Path(__file__).resolve().parents[4]
        wsl_root = "/mnt/" + str(project_root).replace(":\\", "/").replace("\\", "/").replace(
            "C/", "c/"
        ).lower().replace("c/users", "c/Users")
        # The above is intentionally conservative — we normalize at call time.
        drive = project_root.drive.rstrip(":").lower()
        posix_body = project_root.as_posix()
        # Strip leading "C:" if present
        if ":" in posix_body:
            posix_body = posix_body.split(":", 1)[1]
        return f"/mnt/{drive}{posix_body}/{win_relative}"


class _NullRuntime(HermesRuntime):
    """Placeholder for `direct` mode — agents still use HermesClient/KimiVisionClient."""

    mode: RuntimeMode = "direct"

    async def chat(self, messages, *, model=None, json_mode=False, max_tokens=2048, temperature=0.3):  # type: ignore[override]
        raise RuntimeError(
            "direct runtime mode has no bridge. Call HermesClient / KimiVisionClient directly."
        )


@lru_cache(maxsize=1)
def get_runtime() -> HermesRuntime:
    settings = get_settings()
    if settings.hermes_runtime == "cli":
        return HermesCLIBridge(settings)
    return _NullRuntime()
