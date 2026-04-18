#!/usr/bin/env bash
# Post-login text-only smoke test — verifies Nous subscription works via `hermes chat`.
# Run after `hermes auth add nous` succeeded.
set -eu
export PATH="$HOME/.local/bin:$PATH"

echo "==> auth state:"
hermes auth list 2>&1 | head -10 || true

echo
echo "==> status:"
hermes status 2>&1 | head -20

echo
echo "==> Text call (Kimi K2.5 via subscription — should cost \$0):"
OUT=$(hermes chat \
    -q 'Respond with a single JSON object only, no markdown fences: {"hello": "world", "model": "kimi-k2.5"}' \
    -m "moonshotai/kimi-k2.5" \
    --provider nous \
    -Q \
    --source tool \
    --max-turns 1 2>&1)
echo "$OUT"

if echo "$OUT" | grep -qE '"hello"\s*:\s*"world"'; then
    echo
    echo "✅ TEXT VIA SUBSCRIPTION OK"
    exit 0
fi

echo
echo "❌ Text response did not contain the expected JSON."
exit 1
