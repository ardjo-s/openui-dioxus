#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
catalog="$repo_root/prototype/dioxus-components-catalog-eval"
platform="$repo_root/prototype/openui-typed-json-product-eval/platform"
evidence=${OPE6_EVIDENCE_DIR:-$platform/evidence/platform-local}
mkdir -p "$evidence/screenshots" "$evidence/traces"
log="$evidence/traces/desktop.log"
result="$evidence/desktop.json"

cargo build --manifest-path "$catalog/Cargo.toml" --release --features desktop --bin platform-app > "$evidence/traces/desktop-build.log" 2>&1
binary="$catalog/target/release/platform-app"
xvfb_pid=""
if [ "$(uname -s)" = "Linux" ]; then
  export DISPLAY=:99
  Xvfb "$DISPLAY" -screen 0 1440x1000x24 > "$evidence/traces/xvfb.log" 2>&1 &
  xvfb_pid=$!
  sleep 2
fi
"$binary" > "$log" 2>&1 &
app_pid=$!
cleanup() {
  kill "$app_pid" 2>/dev/null || true
  if [ -n "$xvfb_pid" ]; then kill "$xvfb_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT

marker="PLATFORM_SELF_TEST_PASS surfaces=40 families=5"
passed=false
for _ in $(seq 1 90); do
  if grep -q "$marker" "$log"; then passed=true; break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
  sleep 1
done

screenshot="$evidence/screenshots/desktop-surface.png"
if [ "$(uname -s)" = "Darwin" ]; then
  window_id=""
  for _ in $(seq 1 20); do
    window_id=$(swift "$platform/find-macos-window-id.swift" "$app_pid" 2>/dev/null || true)
    if [[ "$window_id" =~ ^[0-9]+$ ]]; then break; fi
    sleep 1
  done
  if [[ "$window_id" =~ ^[0-9]+$ ]]; then screencapture -x -l "$window_id" "$screenshot" || true; fi
elif command -v import >/dev/null; then
  import -display "$DISPLAY" -window root "$screenshot" || true
fi

evidence_complete=false
width=0
height=0
if [ -s "$screenshot" ]; then
  if command -v sips >/dev/null; then
    width=$(sips -g pixelWidth "$screenshot" | awk '/pixelWidth/ {print $2}')
    height=$(sips -g pixelHeight "$screenshot" | awk '/pixelHeight/ {print $2}')
  else
    width=$(identify -format '%w' "$screenshot")
    height=$(identify -format '%h' "$screenshot")
  fi
  if [ "$width" -ge 320 ] && [ "$height" -ge 240 ]; then evidence_complete=true; fi
fi
if [ "$evidence_complete" != true ]; then passed=false; fi
jq -n --argjson passed "$passed" --argjson evidence "$evidence_complete" --arg marker "$marker" --argjson width "$width" --argjson height "$height" \
  '{platform:"desktop",passed:$passed,evidence_complete:$evidence,surfaces:40,families:5,marker:$marker,screenshot:{width:$width,height:$height}}' > "$result"
[ "$passed" = true ]
