#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
RESULTS=${EVAL_RESULTS_DIR:-$ROOT/results-local}
EVALUATION_MODE=${EVAL_MODE:-eval0}
SOURCE_CODEX_HOME=${EVAL_SOURCE_CODEX_HOME:-${CODEX_HOME:-$HOME/.codex}}
CODEX_BIN=${EVAL_CODEX_BIN:-$(command -v codex)}
DIOXUS_CLI_ROOT=${EVAL_DIOXUS_CLI_ROOT:-$ROOT/target/dioxus-cli-0.7.10}

if [ -d "$RESULTS" ] && [ -n "$(find "$RESULTS" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo "refusing to overwrite non-empty results directory: $RESULTS" >&2
  exit 1
fi
if [ ! -f "$SOURCE_CODEX_HOME/auth.json" ]; then
  echo "ChatGPT Codex authentication not found: $SOURCE_CODEX_HOME/auth.json" >&2
  exit 1
fi

mkdir -p "$RESULTS/traces" "$RESULTS/screenshots"
TASK_CODEX_HOME=$(mktemp -d "${TMPDIR:-/tmp}/openui-dioxus-codex-home.XXXXXX")
TASK_CODEX_WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/openui-dioxus-codex-work.XXXXXX")
cleanup() {
  case "$TASK_CODEX_HOME" in
    "${TMPDIR:-/tmp}"/openui-dioxus-codex-home.*) rm -r -- "$TASK_CODEX_HOME" ;;
  esac
  case "$TASK_CODEX_WORKDIR" in
    "${TMPDIR:-/tmp}"/openui-dioxus-codex-work.*) rm -r -- "$TASK_CODEX_WORKDIR" ;;
  esac
}
trap cleanup EXIT
ln -s "$SOURCE_CODEX_HOME/auth.json" "$TASK_CODEX_HOME/auth.json"

CODEX_HOME="$TASK_CODEX_HOME" "$CODEX_BIN" login status > "$RESULTS/traces/codex-login-status.log"
npm test --prefix "$ROOT/oracles"
cargo test --manifest-path "$ROOT/Cargo.toml"
cargo build --release --manifest-path "$ROOT/Cargo.toml" --features ssr --bins

env -u OPENAI_API_KEY \
  EVAL_PROVIDER=codex \
  EVAL_MODE="$EVALUATION_MODE" \
  EVAL_CODEX_BIN="$CODEX_BIN" \
  EVAL_CODEX_HOME="$TASK_CODEX_HOME" \
  EVAL_CODEX_WORKDIR="$TASK_CODEX_WORKDIR" \
  EVAL_RESULTS_DIR="$RESULTS" \
  EVAL_BIN_DIR="$ROOT/target/release" \
  EVAL_PAIRS="${EVAL_PAIRS:-20}" \
  node "$ROOT/oracles/src/run-eval.mjs" | tee "$RESULTS/traces/generation-runner.log"

SURFACE_COUNT=$(jq 'length' "$RESULTS/surfaces.json")
if [ "$SURFACE_COUNT" -gt 0 ]; then
  cargo build --release --manifest-path "$ROOT/Cargo.toml" --features desktop --bin eval-app
fi
EVAL_RESULTS_DIR="$RESULTS" EVAL_DESKTOP_BIN="$ROOT/target/release/eval-app" \
  "$ROOT/scripts/run-desktop.sh"

if [ "$SURFACE_COUNT" -gt 0 ]; then
  if [ ! -x "$DIOXUS_CLI_ROOT/bin/dx" ]; then
    cargo install dioxus-cli --version 0.7.10 --locked --root "$DIOXUS_CLI_ROOT"
  fi
  npm exec --prefix "$ROOT/oracles" -- playwright install chromium
  PATH="$DIOXUS_CLI_ROOT/bin:$PATH" EVAL_RESULTS_DIR="$RESULTS" \
    "$ROOT/scripts/run-web.sh"
else
  EVAL_RESULTS_DIR="$RESULTS" "$ROOT/scripts/run-web.sh"
fi

jq -s '{desktop:.[0],web:.[1]}' "$RESULTS/desktop.json" "$RESULTS/web.json" \
  > "$RESULTS/platform.json"
EVAL_RESULTS_DIR="$RESULTS" "$ROOT/scripts/measure-code.sh"
node "$ROOT/oracles/src/summarize.mjs" "$RESULTS"

MOBILE_PATH="$RESULTS/mobile/mobile.json"
if [ "$EVALUATION_MODE" = "eval0" ] && [ "$(jq -r '.openui_wins' "$RESULTS/summary.json")" = "true" ]; then
  mkdir -p "$RESULTS/mobile"
  PATH="$DIOXUS_CLI_ROOT/bin:$PATH" EVAL_RESULTS_DIR="$RESULTS/mobile" \
    "$ROOT/scripts/run-ios.sh"
fi
if [ "$EVALUATION_MODE" = "eval0" ]; then
  node "$ROOT/oracles/src/finalize.mjs" "$RESULTS/summary.json" "$MOBILE_PATH" \
    "$RESULTS/summary-final.json"
else
  cp "$RESULTS/summary.json" "$RESULTS/summary-final.json"
fi

jq -n \
  --arg codex "$($CODEX_BIN --version)" \
  --arg node "$(node --version)" \
  --arg rust "$(rustc --version)" \
  --arg os "$(uname -srv)" \
  '{codex:$codex,node:$node,rust:$rust,os:$os,authentication:"ChatGPT plan",api_key_used:false}' \
  > "$RESULTS/local-environment.json"

(
  cd "$RESULTS"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS
)

jq '{outcome,winner,mobile_status,pairs_complete,calls,estimated_cost_usd,first_pass_validity,post_repair_validity,protocol_metrics,median_raw_token_advantage,criteria,common_criteria,candidate_criteria}' \
  "$RESULTS/summary-final.json"
