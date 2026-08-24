#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export EVAL_MODE=controlled-three-arm
export EVAL_PAIRS=20
export EVAL_RESULTS_DIR=${EVAL_RESULTS_DIR:-$ROOT/results-three-arm-controlled}

if [ "${1:-}" != "--fake" ]; then
  exec "$ROOT/scripts/run-local-eval.sh"
fi

RESULTS=$EVAL_RESULTS_DIR
if [ -d "$RESULTS" ] && [ -n "$(find "$RESULTS" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo "refusing to overwrite non-empty results directory: $RESULTS" >&2
  exit 1
fi

mkdir -p "$RESULTS/traces" "$RESULTS/preflight" "$RESULTS/reviews"
cp "$ROOT/reviews/ope-3-standards.md" "$ROOT/reviews/ope-3-intent.md" "$RESULTS/reviews/"
(
  cd "$ROOT/evidence/controlled-run-2026-08-24"
  shasum -a 256 -c SHA256SUMS
) > "$RESULTS/traces/ope-1-checksum-verification.log"
TASK_WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/openui-dioxus-three-arm-fake.XXXXXX")
cleanup() {
  case "$TASK_WORKDIR" in
    "${TMPDIR:-/tmp}"/openui-dioxus-three-arm-fake.*) rm -r -- "$TASK_WORKDIR" ;;
  esac
}
trap cleanup EXIT

npm test --prefix "$ROOT/oracles"
cargo test --manifest-path "$ROOT/Cargo.toml"
cargo build --release --manifest-path "$ROOT/Cargo.toml" --features ssr --bins

node "$ROOT/oracles/src/openui-cli.mjs" validate "$ROOT/fixtures/reference.openui" \
  > "$RESULTS/preflight/openui.oracle.json"
node "$ROOT/oracles/src/a2ui-cli.mjs" validate "$ROOT/fixtures/reference.a2ui.json" \
  > "$RESULTS/preflight/a2ui.oracle.json"
node "$ROOT/oracles/src/typed-json-cli.mjs" validate "$ROOT/fixtures/reference.typed-json.json" \
  > "$RESULTS/preflight/typed-json.oracle.json"

"$ROOT/target/release/normalize-openui" \
  "$RESULTS/preflight/openui.oracle.json" "$ROOT/fixtures/reference.openui" \
  "$RESULTS/preflight/openui.surface.json"
"$ROOT/target/release/normalize-a2ui" \
  "$RESULTS/preflight/a2ui.oracle.json" "$ROOT/fixtures/reference.a2ui.json" \
  "$RESULTS/preflight/a2ui.surface.json"
"$ROOT/target/release/normalize-typed-json" \
  "$RESULTS/preflight/typed-json.oracle.json" "$ROOT/fixtures/reference.typed-json.json" \
  "$RESULTS/preflight/typed-json.surface.json"

OPENUI_FINGERPRINT=$("$ROOT/target/release/render-once" "$RESULTS/preflight/openui.surface.json" | jq -r '.fingerprint')
A2UI_FINGERPRINT=$("$ROOT/target/release/render-once" "$RESULTS/preflight/a2ui.surface.json" | jq -r '.fingerprint')
TYPED_JSON_FINGERPRINT=$("$ROOT/target/release/render-once" "$RESULTS/preflight/typed-json.surface.json" | jq -r '.fingerprint')
test "$OPENUI_FINGERPRINT" = "$A2UI_FINGERPRINT"
test "$OPENUI_FINGERPRINT" = "$TYPED_JSON_FINGERPRINT"
jq -n --arg fingerprint "$OPENUI_FINGERPRINT" \
  '{passed:true,arms:["openui","a2ui","typed-json"],semantic_fingerprint:$fingerprint}' \
  > "$RESULTS/preflight/fingerprint.json"

EVAL_PROVIDER=codex \
  EVAL_FAKE_PROVIDER=true \
  EVAL_CODEX_BIN="$ROOT/oracles/test/fixtures/fake-eval-codex.mjs" \
  EVAL_CODEX_HOME="$TASK_WORKDIR" \
  EVAL_CODEX_WORKDIR="$TASK_WORKDIR" \
  EVAL_RESULTS_DIR="$RESULTS" \
  EVAL_BIN_DIR="$ROOT/target/release" \
  EVAL_PAIRS=20 \
  node "$ROOT/oracles/src/run-eval.mjs" | tee "$RESULTS/traces/generation-runner.log"

ACCEPTED=$(jq 'length' "$RESULTS/surfaces.json")
jq -n --argjson count "$ACCEPTED" \
  '{desktop:{passed:true,accepted_count:$count,evidence_complete:true,synthetic:true},web:{passed:true,accepted_count:$count,evidence_complete:true,synthetic:true}}' \
  > "$RESULTS/platform.json"
EVAL_MODE=controlled-three-arm EVAL_RESULTS_DIR="$RESULTS" "$ROOT/scripts/measure-code.sh"
node "$ROOT/oracles/src/summarize.mjs" "$RESULTS"
node "$ROOT/oracles/src/three-arm-report.mjs" "$RESULTS"
cp "$RESULTS/summary.json" "$RESULTS/summary-final.json"
test "$(jq -r '.outcome' "$RESULTS/summary.json")" = "INVALID_EVAL"

(
  cd "$RESULTS"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS
  shasum -a 256 -c SHA256SUMS
)

jq '{outcome,pairs_complete,calls,first_pass_validity,post_repair_validity,pairwise,common_criteria}' \
  "$RESULTS/summary.json"
