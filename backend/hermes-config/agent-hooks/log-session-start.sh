#!/usr/bin/env bash
# Hermes Agent hook — fires when a new session starts.
# stdin: JSON payload with {session_id, source, model, ...}
# stdout: ignored
# Append a one-line JSON record to the audit log on the persistent volume.

set -euo pipefail

LOG="${REBARGUARD_AUDIT_LOG:-/data/hermes/audit-log.jsonl}"
mkdir -p "$(dirname "$LOG")"

# Read stdin (Hermes feeds the event JSON), tag with our event name + UTC ts,
# and append. `jq -c` keeps the line compact; if jq is unavailable, fall back
# to a minimal echo.
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if command -v jq >/dev/null 2>&1; then
  jq -c --arg ts "$TS" --arg ev "on_session_start" \
    '{event: $ev, ts: $ts} + .' \
    >> "$LOG"
else
  PAYLOAD="$(cat)"
  printf '{"event":"on_session_start","ts":"%s","raw":%s}\n' \
    "$TS" "$(printf '%s' "$PAYLOAD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    >> "$LOG"
fi
