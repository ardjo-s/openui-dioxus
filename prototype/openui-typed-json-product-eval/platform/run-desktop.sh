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
marker_observed=false
for _ in $(seq 1 90); do
  if grep -q "$marker" "$log"; then marker_observed=true; break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
  sleep 1
done

screenshot="$evidence/screenshots/desktop-surface.png"
evidence_complete=false
width=0
height=0
if [ "$(uname -s)" = "Darwin" ]; then
  window_id=""
  for _ in $(seq 1 20); do
    window_id=$(swift "$platform/find-macos-window-id.swift" "$app_pid" 2>/dev/null || true)
    if [[ "$window_id" =~ ^[0-9]+$ ]] && screencapture -x -l "$window_id" "$screenshot" && metrics=$(python3 "$platform/check-screenshot.py" "$screenshot" 2>/dev/null); then
      read -r width height _ <<< "$metrics"
      evidence_complete=true
      break
    fi
    sleep 1
  done
elif command -v import >/dev/null && command -v xdotool >/dev/null; then
  for _ in $(seq 1 20); do
    window_id=""
    largest_area=0
    while IFS= read -r candidate; do
      geometry=$(xdotool getwindowgeometry --shell "$candidate" 2>/dev/null || true)
      candidate_width=$(awk -F= '$1 == "WIDTH" {print $2}' <<< "$geometry")
      candidate_height=$(awk -F= '$1 == "HEIGHT" {print $2}' <<< "$geometry")
      if [[ "$candidate_width" =~ ^[0-9]+$ ]] && [[ "$candidate_height" =~ ^[0-9]+$ ]]; then
        area=$((candidate_width * candidate_height))
        if [ "$area" -gt "$largest_area" ]; then window_id=$candidate; largest_area=$area; fi
      fi
    done < <({ xdotool search --onlyvisible --pid "$app_pid" 2>/dev/null || true; xdotool search --onlyvisible --name 'OpenUI-Dioxus|openui-dioxus' 2>/dev/null || true; } | sort -u)
    if [[ "$window_id" =~ ^[0-9]+$ ]] && import -display "$DISPLAY" -window "$window_id" "png24:$screenshot" && metrics=$(python3 "$platform/check-screenshot.py" "$screenshot" 2>/dev/null); then
      read -r width height _ <<< "$metrics"
      evidence_complete=true
      break
    fi
    sleep 1
  done
fi

passed=false
if [ "$marker_observed" = true ] && [ "$evidence_complete" = true ]; then passed=true; fi
jq -n --argjson passed "$passed" --argjson evidence "$evidence_complete" --arg marker "$marker" --argjson width "$width" --argjson height "$height" \
  '{platform:"desktop",passed:$passed,evidence_complete:$evidence,surfaces:40,families:5,marker:$marker,screenshot:{width:$width,height:$height}}' > "$result"
[ "$passed" = true ]
