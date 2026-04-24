"""Hermes Agent CLI bridge.

Uses `hermes chat -q ... -m ... --image ... -Q --provider nous` as a non-interactive
one-shot call. Subscription-backed (Nous Portal $10/mo covers these calls).

On Windows this invokes WSL2: `wsl -d Ubuntu-22.04 -- hermes ...`.

Discovered via Day 2 research spike (Hermes Agent v0.10.0):
- `-q QUERY`   single non-interactive query
- `-m MODEL`   model selection (e.g. `moonshotai/kimi-k2.5`)
- `--image P`  attach a local image to the query (native vision support!)
- `-Q`         quiet mode — only final response to stdout
- `--provider nous`  route through Nous Portal subscription
- `-s SKILLS`  preload comma-separated skill names from ~/.hermes/skills/
"""

from __future__ import annotations

import asyncio
import json
import re
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
    mode: RuntimeMode

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        image: Path | str | None = None,
        json_mode: bool = False,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        skills: list[str] | None = None,
    ) -> BridgeResult:  # pragma: no cover
        raise NotImplementedError


_JSON_TAIL_HINT = (
    "\n\nIMPORTANT: respond with a single valid JSON object only, no markdown fences, "
    "no prose outside the JSON."
)


def _messages_to_prompt(messages: list[dict[str, Any]], *, json_mode: bool) -> str:
    """Flatten OpenAI-style messages into a single prompt for `hermes chat -q`."""
    parts: list[str] = []
    for m in messages:
        role = m.get("role", "user").upper()
        content = m.get("content", "")
        if isinstance(content, list):
            content = " ".join(
                (c.get("text", "") if isinstance(c, dict) else str(c)) for c in content
            )
        parts.append(f"[{role}]\n{content.strip()}")
    prompt = "\n\n".join(parts)
    if json_mode:
        prompt += _JSON_TAIL_HINT
    return prompt


def _win_to_wsl(path: Path | str) -> str:
    p = Path(path).resolve()
    posix = p.as_posix()
    m = re.match(r"^([A-Za-z]):(/.*)$", posix)
    if m:
        return f"/mnt/{m.group(1).lower()}{m.group(2)}"
    return posix


_JSON_OBJECT_RE = re.compile(r"\{[\s\S]*\}")


def _extract_json(text: str) -> dict[str, Any]:
    """Grab the first JSON object from the response, tolerating pre/post prose."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = _JSON_OBJECT_RE.search(text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {"error": "could not parse JSON", "raw": text[:400]}


class HermesCLIBridge(HermesRuntime):
    mode: RuntimeMode = "cli"

    def __init__(self, settings: Settings):
        self._settings = settings
        self._via_wsl = settings.hermes_cli_via_wsl
        self._wsl_distro = settings.hermes_wsl_distro
        self._timeout = settings.hermes_cli_timeout_s

    def _base_cmd(self) -> list[str]:
        if self._via_wsl:
            return ["wsl", "-d", self._wsl_distro, "--", "hermes"]
        if shutil.which("hermes") is None:
            raise RuntimeError(
                "hermes CLI not found. Install via `bash scripts/setup-hermes.sh` "
                "inside WSL2 and set HERMES_CLI_VIA_WSL=true in backend/.env."
            )
        return ["hermes"]

    def _translate_image_path(self, image: Path | str) -> str:
        if self._via_wsl:
            return _win_to_wsl(image)
        return str(Path(image).resolve())

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        image: Path | str | None = None,
        json_mode: bool = False,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        skills: list[str] | None = None,
    ) -> BridgeResult:
        chosen_model = model or self._settings.hermes_agentic_model
        prompt = _messages_to_prompt(messages, json_mode=json_mode)
        cmd = [
            *self._base_cmd(),
            "chat",
            "-q",
            prompt,
            "-m",
            chosen_model,
            "-Q",
            "--provider",
            "nous",
            "--source",
            "tool",
            "--max-turns",
            str(self._settings.hermes_cli_max_turns),
        ]
        if image is not None:
            cmd.extend(["--image", self._translate_image_path(image)])
        if skills:
            cmd.extend(["-s", ",".join(skills)])

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=self._timeout
            )
        except TimeoutError as e:
            proc.kill()
            raise RuntimeError(
                f"hermes CLI timed out after {self._timeout}s"
            ) from e

        if proc.returncode != 0:
            err = stderr.decode("utf-8", "replace").strip()[:400]
            out = stdout.decode("utf-8", "replace").strip()[:400]
            raise RuntimeError(
                f"hermes CLI failed (rc={proc.returncode}). stderr: {err} | stdout: {out}"
            )
        text = stdout.decode("utf-8", "replace").strip()
        return BridgeResult(content=text, model=chosen_model, raw=text)

    async def chat_json(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        image: Path | str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        skills: list[str] | None = None,
    ) -> dict[str, Any]:
        result = await self.chat(
            messages,
            model=model,
            image=image,
            json_mode=True,
            max_tokens=max_tokens,
            temperature=temperature,
            skills=skills,
        )
        return _extract_json(result.content)


class _NullRuntime(HermesRuntime):
    """Placeholder for `direct` mode — agents still use HermesClient/KimiVisionClient."""

    mode: RuntimeMode = "direct"

    async def chat(
        self,
        messages,
        *,
        model=None,
        image=None,
        json_mode=False,
        max_tokens=2048,
        temperature=0.3,
        skills=None,
    ):  # type: ignore[override]
        raise RuntimeError(
            "direct runtime mode has no bridge. Call HermesClient / KimiVisionClient directly."
        )


@lru_cache(maxsize=1)
def get_runtime() -> HermesRuntime:
    settings = get_settings()
    if settings.hermes_runtime == "cli":
        return HermesCLIBridge(settings)
    return _NullRuntime()


__all__ = ["BridgeResult", "HermesCLIBridge", "HermesRuntime", "get_runtime"]
