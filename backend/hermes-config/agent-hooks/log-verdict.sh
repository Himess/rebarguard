#!/usr/bin/env bash
# Hermes Agent hook — fires when a session finalizes (verdict emitted, tokens
# flushed). This is the call we care about for the municipal audit trail.
# stdin: JSON payload with full session metadata.
# stdout: ignored.

set -euo pipefail

LOG="${REBARGUARD_AUDIT_LOG:-/data/hermes/audit-log.jsonl}"
mkdir -p "$(dirname "$LOG")"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if command -v jq >/dev/null 2>&1; then
  # Hermes emits a flat envelope with most metadata under `.extra`. Pull every
  # known field defensively — anything missing falls back to null so the JSONL
  # row is always well-formed even if the upstream payload schema changes.
  jq -c --arg ts "$TS" --arg ev "on_session_finalize" \
    '{event: $ev, ts: $ts,
      session_id: (.session_id // .extra.session_id // null),
      source:     (.source     // .extra.source     // null),
      model:      (.model      // .extra.model      // null),
      provider:   (.provider   // .extra.provider   // null),
      skills:     (.skills     // .extra.skills     // null),
      duration_ms:(.duration_ms// .extra.duration_ms// null),
      cwd:        (.cwd        // null)}' \
    >> "$LOG"
else
  cat >> "$LOG"
  printf '\n' >> "$LOG"
fi
