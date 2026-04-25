#!/usr/bin/env bash
# Run the Hermes Agent MCP server alongside the RebarGuard backend so any
# Model Context Protocol client (Claude Desktop, Cursor, Zed, a custom
# Python client, …) can drive our Hermes orchestration directly.
#
# Usage:
#   bash scripts/run-mcp.sh
#
# Prereq:
#   - `hermes` CLI installed + `hermes auth add nous` OAuth completed
#   - Custom skills at ~/.hermes/skills/rebarguard/ (handled by backend/Dockerfile
#     entrypoint on Fly; on local dev, symlink skills/rebarguard into ~/.hermes/skills)
#
# Notes:
#   Hermes's MCP server exposes its conversation + tool-use layer over stdio or
#   streamable-http. Combined with our preloaded SKILL.md files (parse-structural-plan,
#   inspect-rebar, moderate-inspection), an external MCP client gets first-class
#   access to the exact skills our FastAPI backend uses internally.

set -euo pipefail

SKILLS="${REBARGUARD_SKILLS:-parse-structural-plan,inspect-rebar,moderate-inspection}"
MODEL="${REBARGUARD_MODEL:-moonshotai/kimi-k2.6}"

exec hermes mcp serve \
  -s "$SKILLS" \
  -m "$MODEL" \
  --provider nous \
  "$@"
