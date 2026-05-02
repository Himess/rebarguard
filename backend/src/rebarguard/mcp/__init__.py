"""RebarGuard MCP server — exposes the inspection registry + RAG as Model Context
Protocol tools so that any MCP client (Claude Desktop, ChatGPT desktop, another
Hermes Agent instance, etc.) can list pending inspections, fetch verdicts, look
up TBDY 2018 / TS 500 articles, or seed the canonical Fıstık demo without going
through our web UI.

Why MCP: it's the most Hermes-native pattern in the framework — Hermes Agent
both consumes MCP servers (`hermes mcp add`) and serves them (`hermes mcp serve`).
Exposing RebarGuard as MCP makes the project a citizen of the wider agent
ecosystem rather than a closed-loop UI.

Wire shape:
    [Claude Desktop / external Hermes / ChatGPT desktop]
            ↓ stdio
    [`python -m rebarguard.mcp`  (this package)]
            ↓ HTTP
    [`rebarguard-api.fly.dev`  (existing FastAPI)]

The MCP layer is a thin HTTP client wrapper — no logic duplication, no
state divergence. Set `REBARGUARD_BACKEND_URL` to point at a different
backend (default: production Fly URL).

Run locally:
    uv run python -m rebarguard.mcp

Add to Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):
    {
      "mcpServers": {
        "rebarguard": {
          "command": "uv",
          "args": ["run", "python", "-m", "rebarguard.mcp"],
          "cwd": "/path/to/RebarGuard/backend"
        }
      }
    }
"""

from rebarguard.mcp.server import build_server, main

__all__ = ["build_server", "main"]
