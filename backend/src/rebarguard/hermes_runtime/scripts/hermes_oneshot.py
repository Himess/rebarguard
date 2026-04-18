#!/usr/bin/env python3
"""One-shot Hermes Agent chat helper.

Reads a JSON payload from stdin with shape:
  {
    "messages": [...],
    "model": "moonshotai/kimi-k2.5",
    "max_tokens": 2048,
    "temperature": 0.3,
    "response_format": {"type": "json_object"}   # optional
  }

Invokes Hermes Agent's Python client (inside the Hermes Agent venv) to produce a single
completion. Emits a JSON object on stdout:
  {
    "content": "...",
    "model": "moonshotai/kimi-k2.5",
    "tool_calls": [],
    "usage": {...}
  }

This script is meant to be executed INSIDE the Hermes Agent venv (via `hermes run --script`)
so that its LLM calls count against the Nous Portal subscription rather than a separate
direct-API billing tier.
"""

from __future__ import annotations

import json
import sys


def _fail(message: str, code: int = 1) -> None:
    sys.stdout.write(json.dumps({"error": message}))
    sys.stdout.flush()
    sys.exit(code)


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as e:
        _fail(f"invalid JSON on stdin: {e}")
        return

    try:
        # NOTE: The exact import path may differ; Day 2 research spike confirms the API.
        # These are the candidates we'll try in order.
        client = None
        try:
            from hermes_agent import Agent  # type: ignore

            client = Agent()
        except Exception:
            try:
                from hermes_agent.client import Client  # type: ignore

                client = Client()
            except Exception as e:
                _fail(f"Hermes Agent Python API not found: {e}")
                return

        response = client.chat(
            messages=payload.get("messages", []),
            model=payload.get("model"),
            max_tokens=payload.get("max_tokens", 2048),
            temperature=payload.get("temperature", 0.3),
            response_format=payload.get("response_format"),
        )
        # Normalize response to our shape — best-effort until we know the real surface.
        out = {
            "content": getattr(response, "content", None) or getattr(response, "text", "") or str(response),
            "model": payload.get("model"),
            "tool_calls": getattr(response, "tool_calls", []) or [],
            "usage": getattr(response, "usage", {}) or {},
        }
        sys.stdout.write(json.dumps(out, ensure_ascii=False))
        sys.stdout.flush()
    except Exception as e:  # noqa: BLE001
        _fail(f"hermes oneshot failed: {e}", code=2)


if __name__ == "__main__":
    main()
