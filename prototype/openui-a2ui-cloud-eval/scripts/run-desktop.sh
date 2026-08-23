#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results}
BIN=${EVAL_DESKTOP_BIN:-$ROOT/target/release/eval-app}
mkdir -p "$RESULTS/screenshots" "$RESULTS/traces"
COUNT=$(jq 'length' "$RESULTS/surfaces.json")
LOG="$RESULTS/traces/desktop.log"

if [ "$COUNT" -eq 0 ]; then
  jq -n '{passed:false,accepted_count:0,marker:"no accepted surfaces"}' > "$RESULTS/desktop.json"
  exit 0
fi

DISPLAY_ID=:99
Xvfb "$DISPLAY_ID" -screen 0 1440x1000x24 > "$RESULTS/traces/xvfb.log" 2>&1 &
XVFB_PID=$!
APP_PID=""
cleanup() {
  if [ -n "$APP_PID" ]; then kill "$APP_PID" 2>/dev/null || true; fi
  kill "$XVFB_PID" 2>/dev/null || true
}
trap cleanup EXIT
export DISPLAY=$DISPLAY_ID
EVAL_SURFACES_PATH="$RESULTS/surfaces.json" "$BIN" > "$LOG" 2>&1 &
APP_PID=$!

PASSED=false
for _ in $(seq 1 90); do
  if grep -q "DIOXUS_RENDERED surfaces=$COUNT" "$LOG"; then
    PASSED=true
    break
  fi
  if ! kill -0 "$APP_PID" 2>/dev/null; then break; fi
  sleep 1
done

if command -v import >/dev/null 2>&1; then
  import -display "$DISPLAY" -window root "$RESULTS/screenshots/desktop-all-surfaces.png" || true
fi
jq -n --argjson passed "$PASSED" --argjson count "$COUNT" \
  --arg marker "DIOXUS_RENDERED surfaces=$COUNT" \
  '{passed:$passed,accepted_count:$count,marker:$marker}' > "$RESULTS/desktop.json"
