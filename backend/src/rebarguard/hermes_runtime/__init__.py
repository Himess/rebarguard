"""Hermes Agent runtime bridge — routes our LLM calls through the Hermes Agent framework.

Three runtime modes selectable via env var `HERMES_RUNTIME`:
- `direct` (default during Day 1-2): our existing OpenAI-compat direct-API clients.
- `cli`:    subprocess bridge to `hermes run` / `hermes chat`. Uses the Nous Portal
            subscription (covered by $10/mo plan).
- `sdk`:    Python SDK import from the `hermes_agent` package (if usable).

On Windows, `cli` mode invokes WSL2 (`wsl -d Ubuntu-22.04 -- hermes ...`).
"""

from rebarguard.hermes_runtime.bridge import (
    HermesCLIBridge,
    HermesRuntime,
    get_runtime,
)

__all__ = ["HermesCLIBridge", "HermesRuntime", "get_runtime"]
