"""Agentic-model client — routes to Nous Portal OpenAI-compatible endpoint.

Nous Portal recommends agentic models (Kimi K2.5, GPT-5.4, GLM 5, Claude, etc.) over Hermes 4
for Hermes Agent workloads. Our default is `moonshotai/kimi-k2.5` (free tier).
`HERMES_REASONING_MODEL` (default `Hermes-4-70B`) is kept as an option for pure reasoning calls.
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
        if not settings.nous_portal_api_key:
            raise RuntimeError(
                "NOUS_PORTAL_API_KEY is not set. Subscribe at https://portal.nousresearch.com."
            )
        self._client = AsyncOpenAI(
            api_key=settings.nous_portal_api_key,
            base_url=settings.nous_portal_base_url,
        )
        self._agentic_model = settings.hermes_agentic_model
        self._reasoning_model = settings.hermes_reasoning_model

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
        kwargs: dict[str, Any] = {
            "model": model or self._agentic_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        resp = await self._client.chat.completions.create(**kwargs)
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
        try:
            return json.loads(result["content"] or "{}")
        except json.JSONDecodeError:
            return {"error": "invalid json", "raw": result["content"]}


@lru_cache(maxsize=1)
def get_hermes_client() -> HermesClient:
    return HermesClient(get_settings())
