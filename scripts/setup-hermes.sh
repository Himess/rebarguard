#!/usr/bin/env bash
# Interactive Hermes Agent setup — run inside WSL2 Ubuntu.
# Installs the framework (if missing) and runs `hermes login` with the Nous Portal subscription.
#
# Usage (from a WSL2 shell):
#   bash scripts/setup-hermes.sh

set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.hermes/hermes-agent/bin:$PATH"

echo "==> 1/4: Install Hermes Agent (if missing)"
if ! command -v hermes >/dev/null 2>&1; then
    curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-setup
    export PATH="$HOME/.local/bin:$HOME/.hermes/hermes-agent/bin:$PATH"
fi
hermes --version || { echo "hermes still not on PATH"; exit 1; }

echo
echo "==> 2/4: Sign in to Nous Portal subscription (OAuth device flow)"
echo "   A URL + code will print — open it in Windows browser, paste the code, approve."
hermes login --provider nous

echo
echo "==> 3/4: Set Kimi K2.6 as the default agentic model"
hermes setup model --non-interactive || true
hermes config set agent.model moonshotai/kimi-k2.6 2>/dev/null \
    || echo "   (set the model interactively via 'hermes model' if needed)"

echo
echo "==> 4/4: Sanity check"
hermes status 2>&1 | head -20

cat <<EOF

────────────────────────────────────────────────────────────
Setup complete. Next:

  1. From this SAME WSL shell, try a text call:
       hermes chat -q "say hi as JSON {\"hi\": true}" -m moonshotai/kimi-k2.6 --provider nous -Q

  2. Place a sample rebar JPG at  data/rebar_photos/smoke-test.jpg

  3. Test vision (subscription multimodal):
       bash scripts/test-hermes-vision.sh

  4. If vision test passes (exit 0):
       → set HERMES_RUNTIME=cli in backend/.env

EOF
