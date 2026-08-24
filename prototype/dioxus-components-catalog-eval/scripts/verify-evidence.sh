#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
repo=$(cd "$root/../.." && pwd -P)
source_commit=bf007c15d0cf4d04d3181cc46cf12325aa773955

jq -e '.components | length == 12' "$root/catalog/manifest.json" >/dev/null
jq -e --arg commit "$source_commit" '.source.commit == $commit' "$root/catalog/manifest.json" >/dev/null
rg -q "dioxus-components\\?rev=$source_commit#$source_commit" "$root/Cargo.lock"
cargo metadata --locked --manifest-path "$root/Cargo.toml" --features ui --format-version 1 >/dev/null

git -C "$repo" diff --exit-code a43a0ff -- \
  prototype/openui-a2ui-cloud-eval/src/domain.rs \
  prototype/openui-a2ui-cloud-eval/src/runtime.rs \
  prototype/openui-a2ui-cloud-eval/src/catalog.rs >/dev/null

jq -e '
  .component_count == 12 and
  .workflow_count == 5 and
  .runtime_behavior_diff_lines == 0 and
  .source_commit == "bf007c15d0cf4d04d3181cc46cf12325aa773955"
' "$root/evidence/summary.json" >/dev/null
