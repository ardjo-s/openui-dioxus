#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results}
BIN=${EVAL_DESKTOP_BIN:-$ROOT/target/release/eval-app}
mkdir -p "$RESULTS/screenshots" "$RESULTS/traces"
COUNT=$(jq 'length' "$RESULTS/surfaces.json")
LOG="$RESULTS/traces/desktop.log"

if [ "$COUNT" -eq 0 ]; then
  jq -n '{passed:false,accepted_count:0,marker:"no accepted surfaces",evidence_complete:true}' > "$RESULTS/desktop.json"
  exit 0
fi

APP_PID=""
XVFB_PID=""
cleanup() {
  if [ -n "$APP_PID" ]; then kill "$APP_PID" 2>/dev/null || true; fi
  if [ -n "$XVFB_PID" ]; then kill "$XVFB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

if [ "$(uname -s)" = "Linux" ]; then
  DISPLAY_ID=:99
  Xvfb "$DISPLAY_ID" -screen 0 1440x1000x24 > "$RESULTS/traces/xvfb.log" 2>&1 &
  XVFB_PID=$!
  export DISPLAY=$DISPLAY_ID
fi

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

SCREENSHOT="$RESULTS/screenshots/desktop-all-surfaces.png"
EVIDENCE_COMPLETE=false
if [ "$(uname -s)" = "Linux" ] && command -v import >/dev/null 2>&1; then
  import -display "$DISPLAY" -window root "$SCREENSHOT" || true
fi
if [ "$(uname -s)" = "Darwin" ] && command -v screencapture >/dev/null 2>&1; then
  WINDOW_ID=$(swift "$ROOT/scripts/find-macos-window-id.swift" "$APP_PID" 2>/dev/null || true)
  if [[ "$WINDOW_ID" =~ ^[0-9]+$ ]]; then
    screencapture -x -l "$WINDOW_ID" "$SCREENSHOT" || true
  fi
fi
if [ -s "$SCREENSHOT" ]; then EVIDENCE_COMPLETE=true; fi
if [ "$EVIDENCE_COMPLETE" != true ]; then PASSED=false; fi
jq -n --argjson passed "$PASSED" --argjson count "$COUNT" --argjson evidence "$EVIDENCE_COMPLETE" \
  --arg marker "DIOXUS_RENDERED surfaces=$COUNT" \
  '{passed:$passed,accepted_count:$count,marker:$marker,evidence_complete:$evidence}' > "$RESULTS/desktop.json"
