#!/usr/bin/env bash
# Hermes Agent hook — fires after every LLM call that matched our skills.
# Captures token counts + latency so we can prove the dual-model architecture
# (Kimi K2.6 for vision, Hermes 4 70B for reasoning) actually executed.
# stdin: JSON payload {model, input_tokens, output_tokens, latency_ms, skill, ...}

set -euo pipefail

LOG="${REBARGUARD_AUDIT_LOG:-/data/hermes/audit-log.jsonl}"
mkdir -p "$(dirname "$LOG")"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if command -v jq >/dev/null 2>&1; then
  # Defensive: pull from both top-level and .extra so we don't lose data when
  # the Hermes payload shape evolves.
  jq -c --arg ts "$TS" --arg ev "post_llm_call" \
    '{event: $ev, ts: $ts,
      model:        (.model        // .extra.model        // null),
      skill:        (.skill        // .extra.skill        // null),
      provider:     (.provider     // .extra.provider     // null),
      input_tokens: (.input_tokens // .extra.input_tokens // null),
      output_tokens:(.output_tokens// .extra.output_tokens// null),
      latency_ms:   (.latency_ms   // .extra.latency_ms   // null),
      session_id:   (.session_id   // .extra.session_id   // null)}' \
    >> "$LOG"
else
  cat >> "$LOG"
  printf '\n' >> "$LOG"
fi
