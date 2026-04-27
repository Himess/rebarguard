#!/usr/bin/env bash
# Foreground Hermes Agent cron gateway — fires the scheduled jobs registered
# by `scripts/install-cron.sh`.
#
# Why this script exists separately from the FastAPI process:
#   The Fly machine that hosts our backend uses `auto_stop_machines = "suspend"`
#   so it can sleep when no traffic arrives. A continuously-running cron
#   gateway would defeat that and burn the always-on minutes budget. We keep
#   the API auto-suspending and document this gateway as the *opt-in* way to
#   actually fire scheduled jobs:
#
#     - For local dev, run this in a separate terminal alongside `uv run uvicorn`.
#     - For production, either (a) flip `min_machines_running = 1` in fly.toml
#       and start this from the Dockerfile entrypoint, or (b) host the gateway
#       on a separate always-on Fly app and point it at the same volume.
#
# We deliberately do NOT auto-start this on Fly today — submission-period
# budget control + judge demos can run jobs manually with:
#
#     hermes cron run rebarguard-daily-audit
#     hermes cron run rebarguard-weekly-afad-probe

set -euo pipefail

if ! command -v hermes >/dev/null 2>&1; then
  echo "hermes CLI not found. Install via scripts/setup-hermes.sh first." >&2
  exit 1
fi

if ! hermes cron list >/dev/null 2>&1; then
  echo "hermes cron jobs not registered yet. Run scripts/install-cron.sh first." >&2
  exit 1
fi

echo "Starting Hermes cron gateway. Press Ctrl+C to stop."
echo "Registered jobs:"
hermes cron list || true
echo ""
echo "Tick output below — every minute the gateway evaluates the cron table:"
exec hermes cron status --watch
