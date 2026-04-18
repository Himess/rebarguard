#!/usr/bin/env bash
# Interactive Hermes Agent setup — run inside WSL2 Ubuntu.
# Installs the framework and launches the subscription-login wizard.
#
# Usage (from a WSL2 shell):
#   bash scripts/setup-hermes.sh

set -euo pipefail

echo "==> Installing Hermes Agent (if missing)..."
if ! command -v hermes >/dev/null 2>&1; then
    curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-setup
    export PATH="$HOME/.local/bin:$HOME/.hermes/hermes-agent/bin:$PATH"
fi

echo "==> Running 'hermes setup' — follow the prompts to sign in with your Nous Portal subscription."
hermes setup

echo "==> Selecting Kimi K2.5 as the default agentic model..."
hermes model moonshotai/kimi-k2.5 || echo "(you can pick it manually later via 'hermes model')"

echo "==> Done. Sanity check:"
hermes --version || true
hermes model || true

cat <<EOF

Next steps:
  1. cd /mnt/c/Users/USER/Desktop/RebarGuard/backend
  2. Ensure backend/.env has: HERMES_RUNTIME=cli  and  HERMES_CLI_VIA_WSL=true
  3. From Windows (outside WSL), run: uvicorn rebarguard.main:app --reload

EOF
