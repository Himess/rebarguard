#!/usr/bin/env bash
# Day 2 morning spike — verify Hermes Agent framework multimodal support.
# Run inside WSL2 Ubuntu after `bash scripts/setup-hermes.sh` completes.
#
# Exit code 0 = vision works via subscription → switch HERMES_RUNTIME=cli.
# Exit code 1 = vision fails → keep direct for vision, use subscription for text only.

set -eu

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLE="$PROJECT_ROOT/data/rebar_photos/smoke-test.jpg"

if [ ! -f "$SAMPLE" ]; then
    echo "!! Put a sample rebar JPG at: $SAMPLE"
    echo "   Even a random RC column photo from Roboflow will do."
    exit 2
fi

echo "==> 1/3: Hermes CLI sanity"
hermes --version || { echo "hermes not on PATH"; exit 1; }

echo "==> 2/3: Current model"
hermes model || true

echo "==> 3/3: Multimodal roundtrip via subscription"
# Attempt 1 — structured script execution if supported:
cat > /tmp/hermes_vision_test.py <<'PY'
import json
import sys

try:
    from hermes_agent import Agent
except Exception as e:
    print(json.dumps({"ok": False, "stage": "import", "error": str(e)}))
    sys.exit(1)

import base64, pathlib
p = pathlib.Path(sys.argv[1])
b64 = base64.b64encode(p.read_bytes()).decode("ascii")

agent = Agent()
try:
    resp = agent.chat(
        model="moonshotai/kimi-k2.5",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "How many rebars are visible? Answer with JSON {count:int}."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ],
        }],
        max_tokens=128,
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    print(json.dumps({"ok": True, "content": getattr(resp, "content", None) or str(resp)}))
except Exception as e:
    print(json.dumps({"ok": False, "stage": "call", "error": str(e)}))
    sys.exit(1)
PY

if hermes run --script /tmp/hermes_vision_test.py -- "$SAMPLE" 2>&1 | tee /tmp/hermes-vision-out.json; then
    if grep -q '"ok": true' /tmp/hermes-vision-out.json; then
        echo
        echo "✅ VISION WORKS VIA SUBSCRIPTION."
        echo "   Set HERMES_RUNTIME=cli in backend/.env and switch over."
        exit 0
    fi
fi

echo
echo "❌ VISION DID NOT RESPOND CORRECTLY."
echo "   Keep VISION_BACKEND=moonshot for image calls; still use subscription for text."
exit 1
