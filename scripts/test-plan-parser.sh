#!/usr/bin/env bash
# Day 3 smoke — upload a PDF to POST /api/projects and inspect the parsed StructuralPlan.
# Default uses TBDY 2018 regulation PDF (not a drawing, but exercises the pipeline).
# Override with: bash scripts/test-plan-parser.sh /path/to/real-drawing.pdf

set -eu

PDF="${1:-/mnt/c/Users/USER/Desktop/RebarGuard/data/regulations/TBDY_2018.pdf}"
BACKEND="${BACKEND:-http://localhost:8000}"

echo "==> POST $PDF to $BACKEND/api/projects"
OUT=$(curl -sS -X POST -F "pdf=@$PDF" "$BACKEND/api/projects")
echo "$OUT" | python3 -m json.tool 2>/dev/null || echo "$OUT"
echo
echo "==> GET /api/projects"
curl -sS "$BACKEND/api/projects" | python3 -m json.tool 2>/dev/null | head -40
