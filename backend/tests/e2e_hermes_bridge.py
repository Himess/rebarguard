"""End-to-end sanity: our HermesClient + KimiVisionClient route through the cli bridge.

Run (from the WSL shell, after `uv sync`):
    uv run python backend/tests/e2e_hermes_bridge.py

Skipped unless a real `hermes` CLI is reachable (so pytest CI won't flake).
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from rebarguard.config import get_settings
from rebarguard.hermes import get_hermes_client
from rebarguard.hermes_runtime import get_runtime
from rebarguard.hermes_runtime.bridge import HermesCLIBridge
from rebarguard.vision import get_kimi_client


async def main() -> None:
    settings = get_settings()
    print(f"runtime={settings.hermes_runtime} vision_backend={settings.vision_backend}")
    print(f"model={settings.hermes_agentic_model} reasoning={settings.hermes_reasoning_model}")
    print(f"via_wsl={settings.hermes_cli_via_wsl} distro={settings.hermes_wsl_distro}")

    runtime = get_runtime()
    assert isinstance(runtime, HermesCLIBridge), f"expected cli bridge, got {runtime!r}"

    # 1 — text via HermesClient
    hc = get_hermes_client()
    text_out = await hc.json_complete(
        system="You are a JSON oracle. Output only a JSON object.",
        user='Return {"ok": true, "where": "hermes-cli"}',
        max_tokens=128,
    )
    print("text result:", json.dumps(text_out, ensure_ascii=False))
    assert text_out.get("ok") is True, "text call did not return ok:true"

    # 2 — vision via KimiVisionClient
    img = Path("data/rebar_photos/smoke-test.jpg")
    if not img.exists():
        img = Path("/mnt/c/Users/USER/Desktop/RebarGuard/data/rebar_photos/smoke-test.jpg")
    assert img.exists(), "smoke-test.jpg missing — generate it with scripts/_make-test-image.sh"
    kc = get_kimi_client()
    vis_out = await kc.analyze_image(
        img,
        'Count the visible rebars. Respond ONLY as JSON: {"count": int}',
        max_tokens=256,
    )
    print("vision result:", json.dumps(vis_out, ensure_ascii=False))
    assert "count" in vis_out, "vision call did not return count"

    print("E2E OK")


if __name__ == "__main__":
    asyncio.run(main())
