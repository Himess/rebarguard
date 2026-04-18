"""Agentic-model client — routes through Hermes Agent CLI (subscription) or direct API.

Mode selection via `HERMES_RUNTIME`:
- `cli`    (default): subprocess `hermes chat` covered by Nous Portal $10/mo subscription.
- `direct`:           direct OpenAI-compat call to Nous Portal (pay-per-token).

The client surface is the same in both modes so downstream agents don't change.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from rebarguard.config import Settings, get_settings


class HermesClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._mode = settings.hermes_runtime
        self._agentic_model = settings.hermes_agentic_model
        self._reasoning_model = settings.hermes_reasoning_model

        self._direct: AsyncOpenAI | None = None
        if self._mode == "direct":
            if not settings.nous_portal_api_key:
                raise RuntimeError(
                    "HERMES_RUNTIME=direct but NOUS_PORTAL_API_KEY is unset."
                )
            self._direct = AsyncOpenAI(
                api_key=settings.nous_portal_api_key,
                base_url=settings.nous_portal_base_url,
            )

    @property
    def agentic_model(self) -> str:
        return self._agentic_model

    @property
    def reasoning_model(self) -> str:
        return self._reasoning_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def complete(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None = None,
        tools: list[dict[str, Any]] | None = None,
        json_mode: bool = False,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        chosen = model or self._agentic_model
        if self._mode == "cli":
            return await self._complete_cli(
                messages, model=chosen, json_mode=json_mode, max_tokens=max_tokens, temperature=temperature
            )
        return await self._complete_direct(
            messages,
            model=chosen,
            tools=tools,
            json_mode=json_mode,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    async def _complete_cli(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> dict[str, Any]:
        from rebarguard.hermes_runtime import get_runtime

        runtime = get_runtime()
        result = await runtime.chat(  # type: ignore[attr-defined]
            messages,
            model=model,
            json_mode=json_mode,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return {
            "content": result.content,
            "tool_calls": [],
            "finish_reason": "stop",
            "usage": {},
            "model": result.model,
        }

    async def _complete_direct(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str,
        tools: list[dict[str, Any]] | None,
        json_mode: bool,
        max_tokens: int,
        temperature: float,
    ) -> dict[str, Any]:
        assert self._direct is not None
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        resp = await self._direct.chat.completions.create(**kwargs)
        msg = resp.choices[0].message
        return {
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments or "{}"),
                }
                for tc in (msg.tool_calls or [])
            ],
            "finish_reason": resp.choices[0].finish_reason,
            "usage": resp.usage.model_dump() if resp.usage else {},
            "model": kwargs["model"],
        }

    async def json_complete(
        self,
        system: str,
        user: str,
        *,
        model: str | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        result = await self.complete(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            model=model,
            json_mode=True,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        content = result.get("content") or "{}"
        # In cli mode, prose may wrap the JSON — extract tolerantly
        if self._mode == "cli":
            from rebarguard.hermes_runtime.bridge import _extract_json  # type: ignore

            return _extract_json(content)
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"error": "invalid json", "raw": content}


@lru_cache(maxsize=1)
def get_hermes_client() -> HermesClient:
    return HermesClient(get_settings())
