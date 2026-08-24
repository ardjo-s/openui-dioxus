#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results}
EVALUATION_MODE=${EVAL_MODE:-eval0}
REPO=$(git -C "$ROOT" rev-parse --show-toplevel)
OPENUI_COMMIT=${OPENUI_COMMIT:-c64b971416f3437e7a10c995294709dfb639d771}
A2UI_COMMIT=${A2UI_COMMIT:-10b1871de07135489da51f548481b093264e541d}

count_handwritten() {
  awk 'NF && $0 !~ /^[[:space:]]*\/\// && $0 !~ /^[[:space:]]*$/ {count++} END {print count+0}' "$1"
}
OPENUI_LOC=$(count_handwritten "$ROOT/src/openui.rs")
A2UI_LOC=$(count_handwritten "$ROOT/src/a2ui.rs")
if [ "$EVALUATION_MODE" = "controlled-three-arm" ]; then
  TYPED_JSON_LOC=$(count_handwritten "$ROOT/src/typed_json.rs")
  PROVENANCE_LOC=$(awk '/serde\(rename = "typed-json"\)|TypedJson,/ {count++} END {print count+0}' \
    "$ROOT/src/domain.rs")
  jq -n \
    --argjson openui "$OPENUI_LOC" \
    --argjson a2ui "$A2UI_LOC" \
    --argjson typed_json "$((TYPED_JSON_LOC + PROVENANCE_LOC))" \
    --argjson typed_json_adapter "$TYPED_JSON_LOC" \
    --argjson provenance "$PROVENANCE_LOC" \
    '{openui:$openui,a2ui:$a2ui,"typed-json":$typed_json,breakdown:{"typed-json-adapter":$typed_json_adapter,"typed-json-provenance":$provenance},method:"non-empty non-comment adapter LOC; exact typed-json provenance declaration charged to JSON"}' \
    > "$RESULTS/adapter-loc.json"
else
  jq -n --argjson openui "$OPENUI_LOC" --argjson a2ui "$A2UI_LOC" \
    '{openui:$openui,a2ui:$a2ui}' > "$RESULTS/adapter-loc.json"
fi

if [ "$EVALUATION_MODE" = "controlled-three-arm" ]; then
  OPE1_BASE=9014273
  LINES=$(git -C "$REPO" diff --numstat "$OPE1_BASE" -- \
    prototype/openui-a2ui-cloud-eval/src/runtime.rs \
    prototype/openui-a2ui-cloud-eval/src/catalog.rs | \
    awk '{added+=$1; deleted+=$2} END {print added+deleted+0}')
  jq -n --argjson lines "$LINES" --argjson provenance "$PROVENANCE_LOC" --arg from "$OPE1_BASE" \
    '{lines_modified:$lines,provenance_only_lines:$provenance,from:$from,to:"working-tree",behavior_files:["src/runtime.rs","src/catalog.rs"]}' \
    > "$RESULTS/runtime-diff.json"
else
  LINES=$(git -C "$REPO" diff --numstat "$OPENUI_COMMIT" "$A2UI_COMMIT" -- \
    prototype/openui-a2ui-cloud-eval/src/domain.rs \
    prototype/openui-a2ui-cloud-eval/src/runtime.rs \
    prototype/openui-a2ui-cloud-eval/src/catalog.rs | \
    awk '{added+=$1; deleted+=$2} END {print added+deleted+0}')
  jq -n --argjson lines "$LINES" --arg from "$OPENUI_COMMIT" --arg to "$A2UI_COMMIT" \
    '{lines_modified:$lines,from:$from,to:$to}' > "$RESULTS/runtime-diff.json"
fi
