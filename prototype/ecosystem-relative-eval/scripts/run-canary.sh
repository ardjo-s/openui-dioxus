#!/usr/bin/env bash
set -euo pipefail

eval_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
repo_root=$(git -C "$eval_root" rev-parse --show-toplevel)
workspace_root=$(cd "$repo_root/../.." && pwd)
source_auth_root=${EVAL_SOURCE_CODEX_HOME:-${CODEX_HOME:-$HOME/.codex}}
codex_command=${EVAL_CODEX_BIN:-codex}
evaluation_run=${EVAL_RUN:-canary}
case "$evaluation_run" in
  canary) default_output_directory=$eval_root/evidence/candidate-canary ;;
  complete-canary) default_output_directory=$eval_root/evidence/candidate-complete-canary ;;
  complete) default_output_directory=$eval_root/evidence/candidate-complete ;;
  *) echo "Unknown canary run contract: $evaluation_run" >&2; exit 2 ;;
esac
if [ -n "${EVAL_OUTPUT_DIR:-}" ]; then
  output_directory=$EVAL_OUTPUT_DIR
elif [ "$evaluation_run" = "canary" ] && [ -n "${OPE11_CANARY_OUTPUT_DIR:-}" ]; then
  output_directory=$OPE11_CANARY_OUTPUT_DIR
else
  output_directory=$default_output_directory
fi
temporary_base=${TMPDIR:-/tmp}
source_cargo_root=${CARGO_HOME:-$HOME/.cargo}
source_rustup_root=${RUSTUP_HOME:-$HOME/.rustup}
evaluation_language=${LANG:-C.UTF-8}
shared_target_directory=${EVAL_SHARED_CARGO_TARGET_DIR:-$workspace_root/.cache/openui-dioxus-eval/cargo-target}
minimum_free_bytes=${EVAL_MINIMUM_FREE_BYTES:-4294967296}
preflight_storage_record=${EVAL_PRE_PROVIDER_GATE_LOG:-$output_directory.pre-provider-storage-gates.jsonl}
preflight_failure_record=$output_directory/pre-provider-infrastructure.json
export CARGO_TARGET_DIR="$shared_target_directory"
export EVAL_SHARED_CARGO_TARGET_DIR="$shared_target_directory"

if [ ! -f "$source_auth_root/auth.json" ]; then
  echo "ChatGPT Codex authentication not found: $source_auth_root/auth.json" >&2
  exit 2
fi
if ! command -v "$codex_command" >/dev/null 2>&1; then
  echo "Codex CLI not found: $codex_command" >&2
  exit 2
fi
mkdir -p "$output_directory"
if find "$output_directory" -mindepth 1 -print -quit | grep -q .; then
  echo "Refusing to overwrite non-empty canary output: $output_directory" >&2
  exit 2
fi
if [ -e "$preflight_storage_record" ]; then
  echo "Refusing to append an existing pre-provider storage record: $preflight_storage_record" >&2
  exit 2
fi

storage_gate() {
  node scripts/check-storage.mjs \
    --evidence "$output_directory" \
    --target "$shared_target_directory" \
    --stage "$1" \
    --record "$preflight_storage_record" \
    --failure "$preflight_failure_record" \
    --minimum "$minimum_free_bytes" >/dev/null
}

umask 077
evaluation_auth_root=$(mktemp -d "$temporary_base/ope11-codex-home.XXXXXX")
evaluation_workdir=$(mktemp -d "$temporary_base/ope11-codex-workdir.XXXXXX")
cleanup() {
  case "$evaluation_auth_root" in "$temporary_base"/ope11-codex-home.*) rm -r -- "$evaluation_auth_root" ;; esac
  case "$evaluation_workdir" in "$temporary_base"/ope11-codex-workdir.*) rm -r -- "$evaluation_workdir" ;; esac
}
trap cleanup EXIT
ln -s "$source_auth_root/auth.json" "$evaluation_auth_root/auth.json"
mkdir -p "$evaluation_workdir/tmp"

cd "$eval_root"
scripts/bootstrap-tools.sh >/dev/null
storage_gate post-bootstrap
npm test >/dev/null
storage_gate post-tests
npm run typecheck >/dev/null
storage_gate post-typecheck
CARGO_TARGET_DIR="$shared_target_directory" cargo test --manifest-path platform/dioxus/Cargo.toml --features ssr --test platform_contract --quiet >/dev/null
storage_gate post-dioxus-contract
bash -n platform/dioxus/run-desktop.sh
storage_gate post-shell-syntax

playwright_browser_root=$(node --input-type=module -e 'import { chromium } from "playwright"; const executable = chromium.executablePath(); const marker = "/chromium-"; const index = executable.indexOf(marker); if (index < 1) process.exit(2); console.log(executable.slice(0, index));')

env -i \
  PATH="$PATH" \
  HOME="$evaluation_workdir" \
  LANG="$evaluation_language" \
  LC_ALL="$evaluation_language" \
  TMPDIR="$evaluation_workdir/tmp" \
  CODEX_HOME="$evaluation_auth_root" \
  "$codex_command" login status >/dev/null
storage_gate post-authentication-check

env -i \
  PATH="$PATH" \
  HOME="$evaluation_workdir" \
  LANG="$evaluation_language" \
  LC_ALL="$evaluation_language" \
  TMPDIR="$evaluation_workdir/tmp" \
  CARGO_HOME="$source_cargo_root" \
  RUSTUP_HOME="$source_rustup_root" \
  CARGO_NET_OFFLINE="true" \
  CARGO_TARGET_DIR="$shared_target_directory" \
  EVAL_SHARED_CARGO_TARGET_DIR="$shared_target_directory" \
  EVAL_PRE_PROVIDER_GATE_LOG="$preflight_storage_record" \
  EVAL_MINIMUM_FREE_BYTES="$minimum_free_bytes" \
  PLAYWRIGHT_BROWSERS_PATH="$playwright_browser_root" \
  EVAL_CODEX_HOME="$evaluation_auth_root" \
  EVAL_CODEX_WORKDIR="$evaluation_workdir" \
  EVAL_CODEX_BIN="$codex_command" \
  node src/run-canary.mjs --run "$evaluation_run" --provider codex --output "$output_directory"

if [ "$evaluation_run" = "complete" ]; then
  jq -e '.outcome == "INVALID_EVAL" and .operational_preflight_passed == true' "$output_directory/summary.json" >/dev/null
else
  test "$(jq -r '.outcome' "$output_directory/summary.json")" = "PASS"
fi
