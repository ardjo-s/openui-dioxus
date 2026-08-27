#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
eval_root="$repo_root/prototype/ecosystem-relative-eval"
app="$eval_root/platform/dioxus"
target_dir=${OPE11_DIOXUS_TARGET_DIR:-$app/target}
evidence=${OPE11_DIOXUS_DESKTOP_EVIDENCE_DIR:-$eval_root/evidence/dioxus-desktop-local}
fixture=${OPE11_DIOXUS_FIXTURE_PATH:-$eval_root/platform/fixtures/dioxus-surfaces.json}
expected_surfaces=$(jq -r '.entries | length' "$fixture")
if ! [[ "$expected_surfaces" =~ ^[1-9][0-9]*$ ]]; then
  echo "Invalid Dioxus fixture surface count: $expected_surfaces" >&2
  exit 2
fi
mkdir -p "$evidence/screenshots" "$evidence/traces"

cargo build --manifest-path "$app/Cargo.toml" --target-dir "$target_dir" --release --features desktop --bin ope11-dioxus-canary > "$evidence/traces/desktop-build.log" 2>&1
finder_binary=""
if [ "$(uname -s)" = "Darwin" ]; then
  finder="$repo_root/prototype/openui-typed-json-product-eval/platform/find-macos-window-id.swift"
  finder_binary="$evidence/.find-macos-window-id"
  swiftc "$finder" -o "$finder_binary"
fi
binary="$target_dir/release/ope11-dioxus-canary"
combined_log="$evidence/traces/desktop.log"
: > "$combined_log"
app_pid=""
cleanup() {
  if [ -n "$app_pid" ]; then kill "$app_pid" 2>/dev/null || true; fi
  if [ -n "$finder_binary" ]; then rm -f -- "$finder_binary"; fi
}
trap cleanup EXIT

marker="OPE11_DIOXUS_SELF_TEST_PASS surfaces=$expected_surfaces"
screenshots='[]'
all_passed=true
for index in $(seq 0 $((expected_surfaces - 1))); do
  log="$evidence/traces/desktop-$index.log"
  OPE11_DIOXUS_START_INDEX="$index" "$binary" > "$log" 2>&1 &
  app_pid=$!
  marker_observed=false
  rendered_marker="OPE11_DIOXUS_RENDERED index=$index surfaces=$expected_surfaces"
  for _ in $(seq 1 90); do
    if grep -q "$marker" "$log" && grep -q "$rendered_marker" "$log"; then marker_observed=true; break; fi
    if ! kill -0 "$app_pid" 2>/dev/null; then break; fi
    sleep 1
  done

  screenshot_name="dioxus-desktop-$((index + 1)).png"
  screenshot="$evidence/screenshots/$screenshot_name"
  content_crop="$evidence/screenshots/.dioxus-desktop-content-$index.png"
  evidence_complete=false
  width=0
  height=0
  if [ "$marker_observed" = true ] && kill -0 "$app_pid" 2>/dev/null && [ "$(uname -s)" = "Darwin" ]; then
    checker="$repo_root/prototype/openui-typed-json-product-eval/platform/check-screenshot.py"
    sleep 1
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
  kill "$app_pid" 2>/dev/null || true
  wait "$app_pid" 2>/dev/null || true
  app_pid=""
  {
    echo "surface-index=$index"
    cat "$log"
  } >> "$combined_log"
  if [ "$marker_observed" != true ] || [ "$evidence_complete" != true ]; then all_passed=false; fi
  screenshots=$(jq -c --arg file "$screenshot_name" --argjson index "$index" --argjson width "$width" --argjson height "$height" --argjson passed "$evidence_complete" '. + [{index:$index,file:$file,width:$width,height:$height,passed:$passed}]' <<< "$screenshots")
done

manifest_hash=$(sed -n 's/^OPE11_DIOXUS_MANIFEST //p' "$combined_log" | tail -1)
binding_sha256=$(sed -n 's/^OPE11_DIOXUS_BINDING //p' "$combined_log" | tail -1)
first_screenshot=$(jq -c '.[0] // {file:"",width:0,height:0,passed:false}' <<< "$screenshots")
jq -n --argjson passed "$all_passed" --argjson surfaces "$expected_surfaces" --arg marker "$marker" --arg manifest "$manifest_hash" --arg binding "$binding_sha256" --argjson screenshot "$first_screenshot" --argjson screenshots "$screenshots" \
  '{platform:"desktop",routes:["openui","typed-json"],surface_count:$surfaces,passed:$passed,evidence_complete:$passed,marker:$marker,manifest_hash:$manifest,binding_sha256:$binding,accessibility_contract_version:"ope-15-route-neutral-patterns-v1",screenshot:$screenshot,screenshots:$screenshots}' > "$evidence/dioxus-desktop.json"
[ "$all_passed" = true ]
