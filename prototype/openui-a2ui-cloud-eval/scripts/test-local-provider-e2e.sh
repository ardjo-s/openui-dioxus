#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
mkdir -p "$ROOT/target"
SMOKE_RESULTS=$(mktemp -d "$ROOT/target/local-provider-smoke.XXXXXX")
cleanup() {
  case "$SMOKE_RESULTS" in
    "$ROOT"/target/local-provider-smoke.*) rm -r -- "$SMOKE_RESULTS" ;;
  esac
}
trap cleanup EXIT

cargo build --release --manifest-path "$ROOT/Cargo.toml" --features ssr --bins
EVAL_PROVIDER=codex \
  EVAL_CODEX_BIN="$ROOT/oracles/test/fixtures/fake-eval-codex.mjs" \
  EVAL_CODEX_HOME="$SMOKE_RESULTS" \
  EVAL_CODEX_WORKDIR="$SMOKE_RESULTS" \
  EVAL_RESULTS_DIR="$SMOKE_RESULTS/results" \
  EVAL_BIN_DIR="$ROOT/target/release" \
  EVAL_PAIRS=1 \
  node "$ROOT/oracles/src/run-eval.mjs"

test "$(jq 'length' "$SMOKE_RESULTS/results/surfaces.json")" -eq 2
test "$(wc -l < "$SMOKE_RESULTS/results/records.jsonl" | tr -d ' ')" -eq 2
jq -e '.provider == "codex" and .billing_mode == "chatgpt-plan" and .estimated_cost_usd == null' \
  "$SMOKE_RESULTS/results/generation.json" >/dev/null

FAKE_CODEX_OUTPUT_BYTES=5 \
  EVAL_PROVIDER=codex \
  EVAL_CODEX_BIN="$ROOT/oracles/test/fixtures/fake-eval-codex.mjs" \
  EVAL_CODEX_HOME="$SMOKE_RESULTS" \
  EVAL_CODEX_WORKDIR="$SMOKE_RESULTS" \
  EVAL_RESULTS_DIR="$SMOKE_RESULTS/oversized" \
  EVAL_BIN_DIR="$ROOT/target/release" \
  EVAL_MAX_RESPONSE_BYTES=4 \
  EVAL_PAIRS=1 \
  node "$ROOT/oracles/src/run-eval.mjs"
test "$(jq 'length' "$SMOKE_RESULTS/oversized/surfaces.json")" -eq 0
test "$(wc -l < "$SMOKE_RESULTS/oversized/records.jsonl" | tr -d ' ')" -eq 4
jq -e '.diagnostics[] | select(.code == "output-too-large")' \
  "$SMOKE_RESULTS/oversized/diagnostics/01-openui-attempt-1.json" >/dev/null
echo "local-provider-e2e=ok"
