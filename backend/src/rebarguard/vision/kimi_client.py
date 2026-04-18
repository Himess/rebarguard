"""Vision client — routes through Hermes Agent CLI (subscription) or direct API.

Mode selection via `HERMES_RUNTIME` / `VISION_BACKEND`:
- runtime=cli + vision_backend=nous_portal or hermes_cli → `hermes chat --image` (subscription $0)
- runtime=direct + vision_backend=nous_portal → direct Nous Portal OpenAI-compat (paid)
- runtime=direct + vision_backend=moonshot     → direct Moonshot API (paid)
"""

from __future__ import annotations

import base64
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from rebarguard.config import Settings, get_settings


def _encode_image(path: str | Path) -> str:
    data = Path(path).read_bytes()
    return base64.b64encode(data).decode("ascii")


def _image_mime(path: str | Path) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }.get(ext, "image/jpeg")


class KimiVisionClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._runtime = settings.hermes_runtime
        self._vision_backend = settings.vision_backend

        self._direct: AsyncOpenAI | None = None
        self._direct_model: str | None = None

        if self._runtime == "cli" and self._vision_backend in {"nous_portal", "hermes_cli"}:
            # Route all vision through Hermes CLI (subscription) — no direct client needed.
            self._mode = "cli"
        elif self._vision_backend == "moonshot":
            if not settings.moonshot_api_key:
                raise RuntimeError("VISION_BACKEND=moonshot but MOONSHOT_API_KEY is unset.")
            self._direct = AsyncOpenAI(
                api_key=settings.moonshot_api_key, base_url=settings.moonshot_base_url
            )
            self._direct_model = settings.kimi_vision_model
            self._mode = "direct"
        else:
            # direct runtime + nous_portal backend
            if not settings.nous_portal_api_key:
                raise RuntimeError(
                    "HERMES_RUNTIME=direct with VISION_BACKEND=nous_portal needs NOUS_PORTAL_API_KEY."
                )
            self._direct = AsyncOpenAI(
                api_key=settings.nous_portal_api_key, base_url=settings.nous_portal_base_url
            )
            self._direct_model = settings.hermes_agentic_model  # kimi-k2.5 via Nous
            self._mode = "direct"

    @property
    def backend(self) -> str:
        return self._mode

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def analyze_image(
        self,
        image_path: str | Path,
        prompt: str,
        *,
        json_mode: bool = True,
        max_tokens: int = 2048,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        if self._mode == "cli":
            return await self._cli_call(image_path, prompt, json_mode=json_mode)
        return await self._direct_call(
            image_path, prompt, json_mode=json_mode, max_tokens=max_tokens, temperature=temperature
        )

    async def analyze_images(
        self,
        image_paths: list[str | Path],
        prompt: str,
        *,
        json_mode: bool = True,
        max_tokens: int = 4096,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        # `hermes chat --image` accepts a single image per call; fan out sequentially in cli mode.
        if self._mode == "cli":
            results: list[Any] = []
            for p in image_paths:
                results.append(await self._cli_call(p, prompt, json_mode=json_mode))
            return {"images": results}
        return await self._direct_multi_call(
            image_paths, prompt, json_mode=json_mode, max_tokens=max_tokens, temperature=temperature
        )

    async def _cli_call(
        self, image_path: str | Path, prompt: str, *, json_mode: bool
    ) -> dict[str, Any]:
        from rebarguard.hermes_runtime import get_runtime
        from rebarguard.hermes_runtime.bridge import HermesCLIBridge, _extract_json

        runtime = get_runtime()
        if not isinstance(runtime, HermesCLIBridge):
            raise RuntimeError(
                "Vision routed to CLI but runtime is not HermesCLIBridge. "
                "Check HERMES_RUNTIME / VISION_BACKEND combination."
            )
        result = await runtime.chat(
            [{"role": "user", "content": prompt}],
            model=self._settings.hermes_agentic_model,
            image=image_path,
            json_mode=json_mode,
        )
        if json_mode:
            return _extract_json(result.content)
        return {"raw": result.content}

    async def _direct_call(
        self,
        image_path: str | Path,
        prompt: str,
        *,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> dict[str, Any]:
        assert self._direct is not None and self._direct_model is not None
        b64 = _encode_image(image_path)
        mime = _image_mime(image_path)
        content: list[dict[str, Any]] = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
        ]
        kwargs: dict[str, Any] = {
            "model": self._direct_model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = await self._direct.chat.completions.create(**kwargs)
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return {"raw": "", "error": "empty response"}
        if json_mode:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"raw": text, "error": "failed to parse JSON"}
        return {"raw": text}

    async def _direct_multi_call(
        self,
        image_paths: list[str | Path],
        prompt: str,
        *,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> dict[str, Any]:
        assert self._direct is not None and self._direct_model is not None
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for p in image_paths:
            b64 = _encode_image(p)
            mime = _image_mime(p)
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
            )
        kwargs: dict[str, Any] = {
            "model": self._direct_model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = await self._direct.chat.completions.create(**kwargs)
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return {"raw": "", "error": "empty response"}
        if json_mode:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"raw": text, "error": "failed to parse JSON"}
        return {"raw": text}


@lru_cache(maxsize=1)
def get_kimi_client() -> KimiVisionClient:
    return KimiVisionClient(get_settings())
