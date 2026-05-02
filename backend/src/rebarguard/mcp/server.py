"""MCP server implementation — 5 tools that wrap RebarGuard's existing HTTP API.

Tools exposed:

- `list_inspections`   — pending pre-pour inspections in the public registry
- `get_inspection`     — full plan + metadata for a single project id
- `seed_fistik_demo`   — provision the canonical 1340 Ada 43 Parsel project
- `lookup_regulation`  — fetch a TBDY 2018 / TS 500 article by code
- `replay_scenario`    — return scenario metadata (for video demo wiring)

The server is stdio-based so it drops straight into Claude Desktop / Hermes
`mcp add` flows. Each tool maps to one HTTP call against the existing FastAPI
backend — no logic duplication, no state divergence. If we later move the
inspection store to Postgres, the MCP layer keeps working unchanged.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

DEFAULT_BACKEND_URL = "https://rebarguard-api.fly.dev"


def _backend_url() -> str:
    """Allow override via env so the same MCP binary can point at staging / local /
    prod backends without rebuilding."""
    return os.environ.get("REBARGUARD_BACKEND_URL", DEFAULT_BACKEND_URL).rstrip("/")


def _format(payload: Any) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps(payload, indent=2, ensure_ascii=False))]


def _err(msg: str) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps({"error": msg}))]


def build_server() -> Server:
    """Build the MCP Server instance with all 5 tools registered.

    Factored as a function so we can spin up a server inside tests without
    triggering stdio I/O at import time.
    """
    app: Server = Server("rebarguard")

    @app.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(
                name="list_inspections",
                description=(
                    "List every uploaded RebarGuard project pending pre-pour "
                    "inspection in the public registry. Returns project id, name, "
                    "city, parcel, soil class, earthquake zone, floor count, and "
                    "element counts (columns / beams / walls / slabs / stairs)."
                ),
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_inspection",
                description=(
                    "Fetch the full StructuralPlan for a single project id — "
                    "metadata, every column / beam / wall / slab / stair with "
                    "rebar layout, plus Kimi-parsed confidence."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "Project id (UUID, returned by list_inspections or seed_fistik_demo).",
                        },
                    },
                    "required": ["id"],
                },
            ),
            Tool(
                name="seed_fistik_demo",
                description=(
                    "Provision the canonical 1340 Ada 43 Parsel demo project: "
                    "Civ. Eng. Ferhat Baş, Istanbul, 6+2 floors on a 7.95 × 15 m "
                    "footprint, BS30 / B420C, 48 columns + 6 beams + 2 shear "
                    "walls. Idempotent — call any time to refresh the demo."
                ),
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="lookup_regulation",
                description=(
                    "Resolve a Turkish reinforced-concrete code reference to its "
                    "EN + TR article text. Whitelist of 16 curated articles "
                    "(TBDY 2018 + TS 500). Used for grounded citation lookup — "
                    "returns the exact regulatory text behind a 'cover < 25 mm' "
                    "or 'stirrup spacing > 100 mm' finding."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": (
                                "Article code, e.g. 'TBDY 7.3.4.2', 'TS 500 7.3', "
                                "'TBDY 7.6.2'. Case-insensitive."
                            ),
                        },
                    },
                    "required": ["code"],
                },
            ),
            Tool(
                name="replay_scenario",
                description=(
                    "Return metadata about a pre-recorded 9-agent inspection "
                    "debate. Useful for wiring a deterministic demo into another "
                    "agent's workflow without burning Kimi quota."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "scenario": {
                            "type": "string",
                            "description": "Scenario name, e.g. 'fistik_reject'.",
                            "default": "fistik_reject",
                        },
                    },
                    "required": [],
                },
            ),
        ]

    @app.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        base = _backend_url()
        async with httpx.AsyncClient(timeout=30.0) as http:
            try:
                if name == "list_inspections":
                    r = await http.get(f"{base}/api/projects")
                    r.raise_for_status()
                    rows = r.json()
                    summary = []
                    for proj in rows:
                        plan = proj.get("plan", {})
                        meta = plan.get("metadata", {})
                        summary.append(
                            {
                                "id": proj.get("id"),
                                "project_name": meta.get("project_name"),
                                "parcel_no": meta.get("parcel_no"),
                                "city": meta.get("city"),
                                "earthquake_zone": meta.get("earthquake_zone"),
                                "soil_class": meta.get("soil_class"),
                                "floors": meta.get("floor_count"),
                                "elements": {
                                    "columns": len(plan.get("columns", [])),
                                    "beams": len(plan.get("beams", [])),
                                    "shear_walls": len(plan.get("shear_walls", [])),
                                    "slabs": len(plan.get("slabs", [])),
                                    "stairs": len(plan.get("stairs", [])),
                                },
                                "confidence": plan.get("confidence"),
                            }
                        )
                    return _format(
                        {"total": len(summary), "inspections": summary}
                    )

                if name == "get_inspection":
                    pid = (arguments.get("id") or "").strip()
                    if not pid:
                        return _err("id is required")
                    r = await http.get(f"{base}/api/projects/{pid}")
                    if r.status_code == 404:
                        return _err(f"project {pid!r} not found")
                    r.raise_for_status()
                    return _format(r.json())

                if name == "seed_fistik_demo":
                    r = await http.post(f"{base}/api/demo/fistik")
                    r.raise_for_status()
                    proj = r.json()
                    meta = proj.get("plan", {}).get("metadata", {})
                    return _format(
                        {
                            "id": proj.get("id"),
                            "project_name": meta.get("project_name"),
                            "parcel_no": meta.get("parcel_no"),
                            "engineer": meta.get("engineer_name"),
                            "city": meta.get("city"),
                            "floors": f"{meta.get('floor_count')} normal + "
                            f"{meta.get('basement_count')} basement",
                            "earthquake_zone": meta.get("earthquake_zone"),
                            "soil_class": meta.get("soil_class"),
                            "next": (
                                f"Open https://rebarguard.vercel.app/inspection/new"
                                f"?project={proj.get('id')}&replay=fistik_reject"
                                " for the deterministic 9-agent debate cockpit."
                            ),
                        }
                    )

                if name == "lookup_regulation":
                    code = (arguments.get("code") or "").strip()
                    if not code:
                        return _err("code is required")
                    r = await http.get(
                        f"{base}/api/regulations/{httpx.URL(code).path}"
                    )
                    if r.status_code == 404:
                        return _err(
                            f"regulation {code!r} not in whitelist. "
                            "Try one of the 16 curated codes (TBDY 7.3.4.x, "
                            "TBDY 7.4.x, TBDY 7.6.x, TBDY 7.11, TS 500 5.x, "
                            "TS 500 7.x)."
                        )
                    r.raise_for_status()
                    return _format(r.json())

                if name == "replay_scenario":
                    scenario = arguments.get("scenario") or "fistik_reject"
                    r = await http.get(
                        f"{base}/api/demo/replay-meta/{scenario}"
                    )
                    if r.status_code == 404:
                        return _err(f"scenario {scenario!r} not found")
                    r.raise_for_status()
                    meta = r.json()
                    meta["replay_url"] = (
                        f"{base}/api/demo/replay/{scenario}?speed=1.0"
                    )
                    meta["cockpit_hint"] = (
                        "Call seed_fistik_demo first to get a project id, then open "
                        f"https://rebarguard.vercel.app/inspection/new?project=<id>&replay={scenario}"
                    )
                    return _format(meta)

                return _err(f"unknown tool: {name}")
            except httpx.HTTPStatusError as e:
                return _err(f"backend HTTP {e.response.status_code}: {e.response.text[:200]}")
            except httpx.RequestError as e:
                return _err(f"backend unreachable: {e}")

    return app


async def main() -> None:
    """Run the MCP server over stdio. Called by `python -m rebarguard.mcp`."""
    app = build_server()
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
