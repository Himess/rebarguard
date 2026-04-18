"""Vision client — routes to Nous Portal (preferred, Kimi K2.5 is free) or Moonshot directly."""

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
    """OpenAI-compatible vision client. Targets Nous Portal by default (Kimi K2.5 free).

    If `VISION_BACKEND=moonshot`, falls back to direct Moonshot API.
    """

    def __init__(self, settings: Settings):
        if settings.vision_backend == "moonshot":
            if not settings.moonshot_api_key:
                raise RuntimeError(
                    "VISION_BACKEND=moonshot but MOONSHOT_API_KEY is unset."
                )
            self._client = AsyncOpenAI(
                api_key=settings.moonshot_api_key, base_url=settings.moonshot_base_url
            )
            self._model = settings.kimi_vision_model
            self._backend = "moonshot"
        else:
            if not settings.nous_portal_api_key:
                raise RuntimeError(
                    "VISION_BACKEND=nous_portal but NOUS_PORTAL_API_KEY is unset. "
                    "Get one at https://portal.nousresearch.com."
                )
            self._client = AsyncOpenAI(
                api_key=settings.nous_portal_api_key, base_url=settings.nous_portal_base_url
            )
            self._model = "moonshotai/kimi-k2.5"
            self._backend = "nous_portal"

    @property
    def backend(self) -> str:
        return self._backend

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
        b64 = _encode_image(image_path)
        mime = _image_mime(image_path)
        content: list[dict[str, Any]] = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
        ]
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        resp = await self._client.chat.completions.create(**kwargs)
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return {"raw": "", "error": "empty response"}
        if json_mode:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"raw": text, "error": "failed to parse JSON"}
        return {"raw": text}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def analyze_images(
        self,
        image_paths: list[str | Path],
        prompt: str,
        *,
        json_mode: bool = True,
        max_tokens: int = 4096,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for path in image_paths:
            b64 = _encode_image(path)
            mime = _image_mime(path)
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
            )
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        resp = await self._client.chat.completions.create(**kwargs)
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
