#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results}
REPO=$(git -C "$ROOT" rev-parse --show-toplevel)
OPENUI_COMMIT=${OPENUI_COMMIT:-c64b971416f3437e7a10c995294709dfb639d771}
A2UI_COMMIT=${A2UI_COMMIT:-10b1871de07135489da51f548481b093264e541d}

count_handwritten() {
  awk 'NF && $0 !~ /^[[:space:]]*\/\// && $0 !~ /^[[:space:]]*$/ {count++} END {print count+0}' "$1"
}
OPENUI_LOC=$(count_handwritten "$ROOT/src/openui.rs")
A2UI_LOC=$(count_handwritten "$ROOT/src/a2ui.rs")
jq -n --argjson openui "$OPENUI_LOC" --argjson a2ui "$A2UI_LOC" \
  '{openui:$openui,a2ui:$a2ui}' > "$RESULTS/adapter-loc.json"

LINES=$(git -C "$REPO" diff --numstat "$OPENUI_COMMIT" "$A2UI_COMMIT" -- \
  prototype/openui-a2ui-cloud-eval/src/domain.rs \
  prototype/openui-a2ui-cloud-eval/src/runtime.rs \
  prototype/openui-a2ui-cloud-eval/src/catalog.rs | \
  awk '{added+=$1; deleted+=$2} END {print added+deleted+0}')
jq -n --argjson lines "$LINES" --arg from "$OPENUI_COMMIT" --arg to "$A2UI_COMMIT" \
  '{lines_modified:$lines,from:$from,to:$to}' > "$RESULTS/runtime-diff.json"
