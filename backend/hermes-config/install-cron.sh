#!/usr/bin/env bash
# Register RebarGuard's scheduled jobs with the Hermes Agent cron scheduler.
# Idempotent — re-runs are safe; the script skips jobs that already exist.
#
# Run inside the live Fly container after the first deploy:
#   fly ssh console -a rebarguard-api
#   bash /opt/hermes-config/install-cron.sh
#
# Or locally during development (requires `hermes auth add nous` first):
#   bash scripts/install-cron.sh
#
# Verify after registration:
#   hermes cron list
#   hermes cron status

set -euo pipefail

# Helper: skip if a job by this name already exists, otherwise create it.
# Hermes cron create uses positional args: <schedule> [<prompt>], with
# `--name`, `--skill` (repeatable), `--workdir` as flags.
create_job() {
  local name="$1" schedule="$2" prompt="$3"
  shift 3
  if hermes cron list 2>/dev/null | grep -q "$name"; then
    echo "cron[$name] already registered, skipping"
    return 0
  fi
  hermes cron create "$schedule" "$prompt" \
    --name "$name" \
    --workdir /data/hermes \
    "$@"
  echo "cron[$name] registered ($schedule)"
}

# --- Daily 03:00 UTC: roll up the past 24 h of audit-log.jsonl into a digest.
# Hermes 4 70B reads /data/hermes/audit-log.jsonl (written by the post_llm_call
# hook), summarises every Moderator verdict, writes the digest to
# /data/hermes/digests/<date>.md, and tags any REJECT for human review.
create_job \
  "rebarguard-daily-audit" \
  "0 3 * * *" \
  "Read the last 24h of /data/hermes/audit-log.jsonl. Summarise every Moderator verdict (parcel, model, verdict, score). Write the summary to /data/hermes/digests/<UTC-date>.md. Tag any parcel that received a REJECT for human review." \
  --skill moderate-inspection

# --- Weekly Sunday 02:00 UTC: probe the AFAD seismic data feed for new
# high-PGA events near our parcel coordinates. Emits alerts to
# /data/hermes/seismic-alerts.jsonl when anything > 0.4g lands within 50 km.
create_job \
  "rebarguard-weekly-afad-probe" \
  "0 2 * * 0" \
  "Fetch the last 7 days of AFAD earthquake data. Cross-reference with seeded parcels in /data/hermes/rebarguard-sessions.json. Emit alerts for events > 0.4g within 50km. Output JSONL to /data/hermes/seismic-alerts.jsonl." \
  --skill moderate-inspection

echo "All cron jobs registered. Status:"
hermes cron status || true
hermes cron list || true
