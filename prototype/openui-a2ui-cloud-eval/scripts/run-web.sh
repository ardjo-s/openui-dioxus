#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results}
COUNT=$(jq 'length' "$RESULTS/surfaces.json")
mkdir -p "$RESULTS/traces" "$RESULTS/screenshots"

if [ "$COUNT" -eq 0 ]; then
  jq -n '{passed:false,accepted_count:0}' > "$RESULTS/web.json"
  exit 0
fi

cd "$ROOT"
dx build --platform web --release > "$RESULTS/traces/web-build.log" 2>&1
INDEX=$(find "$ROOT/web-dist" "$ROOT/target/dx" -name index.html -type f 2>/dev/null | head -1)
if [ -z "$INDEX" ]; then
  jq -n --argjson count "$COUNT" '{passed:false,accepted_count:$count,error:"web index not found"}' > "$RESULTS/web.json"
  exit 0
fi
PUBLIC=$(dirname "$INDEX")
cp "$RESULTS/surfaces.json" "$PUBLIC/surfaces.json"
python3 -m http.server 4173 --bind 127.0.0.1 --directory "$PUBLIC" > "$RESULTS/traces/web-server.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:4173/ >/dev/null; then break; fi
  sleep 1
done

set +e
cd "$ROOT/oracles"
EVAL_RESULTS_DIR="$RESULTS" EVAL_WEB_URL=http://127.0.0.1:4173 \
  npm exec -- playwright test --config "$ROOT/oracles/playwright.config.mjs" > "$RESULTS/traces/playwright.log" 2>&1
CODE=$?
set -e
if [ "$CODE" -eq 0 ]; then PASSED=true; else PASSED=false; fi
jq -n --argjson passed "$PASSED" --argjson count "$COUNT" \
  '{passed:$passed,accepted_count:$count}' > "$RESULTS/web.json"
