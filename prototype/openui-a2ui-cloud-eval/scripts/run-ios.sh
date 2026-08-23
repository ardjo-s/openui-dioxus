#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results-mobile}
mkdir -p "$RESULTS"
LOG="$RESULTS/ios-build.log"
CONSOLE="$RESULTS/ios-console.log"
STATUS=FAIL
ERROR=""

finish() {
  jq -n --arg status "$STATUS" --arg error "$ERROR" \
    '{status:$status,error:($error | select(length > 0)),pair_count:2}' > "$RESULTS/mobile.json"
}
trap finish EXIT

DEVICE=$(xcrun simctl list devices available -j | jq -r '[.devices[][] | select(.name | startswith("iPhone"))][0].udid // empty')
if [ -z "$DEVICE" ]; then ERROR="no available iPhone simulator"; exit 0; fi
xcrun simctl boot "$DEVICE" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE" -b

cd "$ROOT"
if ! dx build --platform ios --release > "$LOG" 2>&1; then
  ERROR="Dioxus iOS build failed"
  exit 0
fi
APP=$(find "$ROOT/web-dist" "$ROOT/target/dx" -name '*.app' -type d 2>/dev/null | head -1)
if [ -z "$APP" ]; then ERROR="iOS app bundle not found"; exit 0; fi
BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist")
xcrun simctl install "$DEVICE" "$APP"
xcrun simctl launch --console "$DEVICE" "$BUNDLE" > "$CONSOLE" 2>&1 &
LAUNCH_PID=$!
for _ in $(seq 1 90); do
  if grep -q 'IOS_EVAL_PASS surfaces=2' "$CONSOLE"; then STATUS=PASS; break; fi
  sleep 1
done
xcrun simctl io "$DEVICE" screenshot "$RESULTS/ios-simulator.png" || true
kill "$LAUNCH_PID" 2>/dev/null || true
if [ "$STATUS" != PASS ]; then ERROR="IOS_EVAL_PASS marker not observed"; fi
