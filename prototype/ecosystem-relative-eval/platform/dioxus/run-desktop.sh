#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
eval_root="$repo_root/prototype/ecosystem-relative-eval"
app="$eval_root/platform/dioxus"
evidence=${OPE11_DIOXUS_DESKTOP_EVIDENCE_DIR:-$eval_root/evidence/dioxus-desktop-local}
mkdir -p "$evidence/screenshots" "$evidence/traces"

cargo build --manifest-path "$app/Cargo.toml" --release --features desktop --bin ope11-dioxus-canary > "$evidence/traces/desktop-build.log" 2>&1
finder_binary=""
if [ "$(uname -s)" = "Darwin" ]; then
  finder="$repo_root/prototype/openui-typed-json-product-eval/platform/find-macos-window-id.swift"
  finder_binary="$evidence/.find-macos-window-id"
  swiftc "$finder" -o "$finder_binary"
fi
binary="$app/target/release/ope11-dioxus-canary"
log="$evidence/traces/desktop.log"
"$binary" > "$log" 2>&1 &
app_pid=$!
cleanup() {
  kill "$app_pid" 2>/dev/null || true
  if [ -n "$finder_binary" ]; then rm -f -- "$finder_binary"; fi
}
trap cleanup EXIT

marker="OPE11_DIOXUS_SELF_TEST_PASS surfaces=2"
marker_observed=false
for _ in $(seq 1 90); do
  if grep -q "$marker" "$log"; then marker_observed=true; break; fi
  if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
  sleep 1
done

screenshot="$evidence/screenshots/dioxus-desktop.png"
content_crop="$evidence/screenshots/.dioxus-desktop-content.png"
evidence_complete=false
width=0
height=0
if [ "$marker_observed" = true ] && kill -0 "$app_pid" 2>/dev/null && [ "$(uname -s)" = "Darwin" ]; then
  checker="$repo_root/prototype/openui-typed-json-product-eval/platform/check-screenshot.py"
  sleep 2
  for _ in $(seq 1 20); do
    window_id=$("$finder_binary" "$app_pid" 2>/dev/null || true)
    if [[ "$window_id" =~ ^[0-9]+$ ]] && screencapture -x -l "$window_id" "$screenshot" && metrics=$(python3 "$checker" "$screenshot" 2>/dev/null); then
      read -r width height _ <<< "$metrics"
      crop_width=$((width * 4 / 5))
      crop_height=$((height * 3 / 4))
      if sips --cropToHeightWidth "$crop_height" "$crop_width" "$screenshot" --out "$content_crop" >/dev/null 2>&1 && python3 "$checker" "$content_crop" >/dev/null 2>&1; then
        evidence_complete=true
        rm -f -- "$content_crop"
        break
      fi
      rm -f -- "$content_crop"
    fi
    sleep 1
  done
fi

passed=false
if [ "$marker_observed" = true ] && [ "$evidence_complete" = true ]; then passed=true; fi
manifest_hash=$(sed -n 's/^OPE11_DIOXUS_MANIFEST //p' "$log" | tail -1)
binding_sha256=$(sed -n 's/^OPE11_DIOXUS_BINDING //p' "$log" | tail -1)
jq -n --argjson passed "$passed" --argjson evidence "$evidence_complete" --arg marker "$marker" --arg manifest "$manifest_hash" --arg binding "$binding_sha256" --argjson width "$width" --argjson height "$height" \
  '{platform:"desktop",routes:["openui","typed-json"],passed:$passed,evidence_complete:$evidence,marker:$marker,manifest_hash:$manifest,binding_sha256:$binding,accessibility_contract_version:"ope-13-observable-accessibility-v1",screenshot:{file:"dioxus-desktop.png",width:$width,height:$height}}' > "$evidence/dioxus-desktop.json"
[ "$passed" = true ]
