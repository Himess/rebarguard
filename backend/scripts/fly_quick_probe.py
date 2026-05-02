"""Inside-Fly probe: replicate the /quick endpoint's exact Kimi call without
the streaming wrapper, the FastAPI router, or tenacity retries — just one raw
hermes-CLI invocation with the same prompt + image. Times the call so we can
tell whether the production hang is:
  (a) genuine Nous Portal latency > our 120 s bridge timeout, or
  (b) a code-path bug in the wrapper.
Run on the Fly machine via SSH:
  python3 /app/src/rebarguard/../../scripts/fly_quick_probe.py
"""
from __future__ import annotations
import asyncio
import sys
import time
from pathlib import Path

# Make the src package importable when invoked from /app
sys.path.insert(0, "/app/src")

from rebarguard.config import get_settings  # noqa: E402
from rebarguard.hermes_runtime.bridge import HermesCLIBridge, _extract_json  # noqa: E402
from rebarguard.vision.prompts import build_quick_scan_prompt  # noqa: E402


async def main(image_path: str) -> None:
    settings = get_settings()
    bridge = HermesCLIBridge(settings)
    prompt = build_quick_scan_prompt()
    print(f"prompt_len={len(prompt)} bytes", flush=True)
    print(f"image_path={image_path}", flush=True)
    print(f"bridge.timeout={bridge._timeout}s", flush=True)
    print(f"max_turns={settings.hermes_cli_max_turns}", flush=True)
    print("---- starting hermes call ----", flush=True)

    t0 = time.perf_counter()
    try:
        result = await bridge.chat(
            [{"role": "user", "content": prompt}],
            model=settings.hermes_agentic_model,
            image=image_path,
            json_mode=True,
        )
        elapsed = time.perf_counter() - t0
        print(f"---- success after {elapsed:.1f}s ----", flush=True)
        print(f"content_len={len(result.content)} bytes", flush=True)
        parsed = _extract_json(result.content)
        if "findings" in parsed:
            print(f"findings_count={len(parsed['findings'])}", flush=True)
            for i, f in enumerate(parsed["findings"][:3]):
                print(f"  [{i}] {f.get('title')} severity={f.get('severity')}", flush=True)
        else:
            print(f"raw_payload={parsed}", flush=True)
    except Exception as e:
        elapsed = time.perf_counter() - t0
        print(f"---- failed after {elapsed:.1f}s : {type(e).__name__}: {e} ----", flush=True)


if __name__ == "__main__":
    image = sys.argv[1] if len(sys.argv) > 1 else "/tmp/probe.jpg"
    asyncio.run(main(image))
