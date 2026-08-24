#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
catalog="$repo_root/prototype/dioxus-components-catalog-eval"
platform="$repo_root/prototype/openui-typed-json-product-eval/platform"
evidence=${OPE6_EVIDENCE_DIR:-$platform/evidence/platform-ios}
dx_bin=${DIOXUS_CLI_BIN:-$(command -v dx)}
mkdir -p "$evidence/screenshots" "$evidence/traces"
result="$evidence/ios.json"
status=INVALID_EVAL
error=""
log_pid=""

finish() {
  if [ -n "$log_pid" ]; then kill "$log_pid" 2>/dev/null || true; fi
  jq -n --arg status "$status" --arg error "$error" \
    '{platform:"ios",status:$status,passed:($status == "PASS"),evidence_complete:($status == "PASS"),surfaces:40,families:5,error:(if $error == "" then null else $error end)}' > "$result"
}
trap finish EXIT

if ! xcrun -f simctl >/dev/null 2>&1; then error="simctl unavailable"; exit 1; fi
device=$(xcrun simctl list devices available -j | jq -r '[.devices[][] | select(.name | startswith("iPhone"))][0].udid // empty')
if [ -z "$device" ]; then error="no available iPhone Simulator"; exit 1; fi
xcrun simctl boot "$device" 2>/dev/null || true
xcrun simctl bootstatus "$device" -b
rustup target add aarch64-apple-ios-sim

cd "$catalog"
if ! "$dx_bin" build --platform ios --release --bin platform-app > "$evidence/traces/ios-build.log" 2>&1; then error="Dioxus iOS build failed"; exit 1; fi
app=$(find "$catalog/target/dx" -name '*.app' -type d | head -1)
if [ -z "$app" ]; then error="iOS app bundle not found"; exit 1; fi
bundle=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")
xcrun simctl install "$device" "$app"
console="$evidence/traces/ios-console.log"
system_log="$evidence/traces/ios-system.log"
xcrun simctl spawn "$device" log stream --style compact --level info --predicate 'process == "PlatformApp"' > "$system_log" 2>&1 &
log_pid=$!
sleep 2
if ! xcrun simctl launch --terminate-running-process "$device" "$bundle" > "$console" 2>&1; then
  error="simulator launch failed"
  exit 1
fi
marker="PLATFORM_SELF_TEST_PASS surfaces=40 families=5"
container=$(xcrun simctl get_app_container "$device" "$bundle" data)
marker_file="$container/tmp/openui-dioxus-platform.marker"
for _ in $(seq 1 90); do
  if grep -q "$marker" "$marker_file" 2>/dev/null || grep -q "$marker" "$console" || grep -q "$marker" "$system_log"; then status=PASS; break; fi
  sleep 1
done
xcrun simctl io "$device" screenshot "$evidence/screenshots/ios-simulator.png"
if [ "$status" != PASS ]; then
  xcrun simctl spawn "$device" log show --last 10m --style compact --predicate 'process == "PlatformApp"' > "$evidence/traces/ios-diagnostics.log" 2>&1 || true
  error="runtime marker not observed"
  exit 1
fi
if [ ! -s "$evidence/screenshots/ios-simulator.png" ]; then status=INVALID_EVAL; error="iOS screenshot missing"; exit 1; fi
width=$(sips -g pixelWidth "$evidence/screenshots/ios-simulator.png" | awk '/pixelWidth/ {print $2}')
height=$(sips -g pixelHeight "$evidence/screenshots/ios-simulator.png" | awk '/pixelHeight/ {print $2}')
if [ "$width" -lt 320 ] || [ "$height" -lt 240 ]; then status=INVALID_EVAL; error="iOS screenshot dimensions invalid"; exit 1; fi
xcrun simctl terminate "$device" "$bundle" 2>/dev/null || true
