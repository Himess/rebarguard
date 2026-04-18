#!/usr/bin/env bash
# Day 2 morning spike — verify Hermes Agent framework multimodal via subscription.
#
# Run inside WSL2 Ubuntu AFTER `hermes login --provider nous` succeeded.
#
# Exit code 0 = vision works via subscription → switch HERMES_RUNTIME=cli.
# Exit code 1 = vision fails → keep direct for vision, subscription for text only.

set -eu

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLE="${1:-$PROJECT_ROOT/data/rebar_photos/smoke-test.jpg}"

export PATH="$HOME/.local/bin:$PATH"

if [ ! -f "$SAMPLE" ]; then
    echo "!! Put a sample rebar JPG at: $SAMPLE"
    echo "   (a random RC column photo works — Roboflow or your phone)"
    exit 2
fi

echo "==> 1/4: Hermes CLI version"
hermes --version || { echo "hermes not on PATH"; exit 1; }

echo "==> 2/4: Authentication status"
hermes status 2>&1 | head -10 || true

echo "==> 3/4: Text-only smoke test (should cost \$0 — Kimi K2.5)"
hermes chat \
    -q "Respond with valid JSON only: {\"hello\": \"world\", \"model\": \"kimi-k2.5\"}" \
    -m "moonshotai/kimi-k2.5" \
    --provider nous \
    -Q \
    --source tool \
    --max-turns 1 2>&1 | tee /tmp/hermes-text-out.txt || { echo "text call failed"; exit 1; }

echo
echo "==> 4/4: Multimodal smoke test (vision via subscription)"
OUT=$(hermes chat \
    -q "Respond with valid JSON only: count the rebars visible in this image. Schema: {\"count\": int, \"confidence\": 0-1}" \
    -m "moonshotai/kimi-k2.5" \
    --image "$SAMPLE" \
    --provider nous \
    -Q \
    --source tool \
    --max-turns 1 2>&1 || true)
echo "$OUT" | tee /tmp/hermes-vision-out.txt

if echo "$OUT" | grep -qE '"count"\s*:\s*[0-9]+'; then
    echo
    echo "✅ VISION WORKS VIA SUBSCRIPTION."
    echo "   → Set HERMES_RUNTIME=cli in backend/.env"
    exit 0
fi

echo
echo "❌ VISION DID NOT RESPOND WITH COUNT JSON."
echo "   → Keep VISION_BACKEND=moonshot for image calls; still use subscription for text."
exit 1
