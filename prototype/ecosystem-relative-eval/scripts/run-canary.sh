#!/usr/bin/env bash
set -euo pipefail

eval_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
source_auth_root=${EVAL_SOURCE_CODEX_HOME:-${CODEX_HOME:-$HOME/.codex}}
codex_command=${EVAL_CODEX_BIN:-codex}
output_directory=${OPE11_CANARY_OUTPUT_DIR:-$eval_root/evidence/candidate-canary}
temporary_base=${TMPDIR:-/tmp}
source_cargo_root=${CARGO_HOME:-$HOME/.cargo}
source_rustup_root=${RUSTUP_HOME:-$HOME/.rustup}
evaluation_language=${LANG:-C.UTF-8}

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
npm test >/dev/null
npm run typecheck >/dev/null
cargo test --manifest-path platform/dioxus/Cargo.toml --features ssr --test platform_contract --quiet >/dev/null
bash -n platform/dioxus/run-desktop.sh

playwright_browser_root=$(node --input-type=module -e 'import { chromium } from "playwright"; const executable = chromium.executablePath(); const marker = "/chromium-"; const index = executable.indexOf(marker); if (index < 1) process.exit(2); console.log(executable.slice(0, index));')

env -i \
  PATH="$PATH" \
  HOME="$evaluation_workdir" \
  LANG="$evaluation_language" \
  LC_ALL="$evaluation_language" \
  TMPDIR="$evaluation_workdir/tmp" \
  CODEX_HOME="$evaluation_auth_root" \
  "$codex_command" login status >/dev/null

env -i \
  PATH="$PATH" \
  HOME="$evaluation_workdir" \
  LANG="$evaluation_language" \
  LC_ALL="$evaluation_language" \
  TMPDIR="$evaluation_workdir/tmp" \
  CARGO_HOME="$source_cargo_root" \
  RUSTUP_HOME="$source_rustup_root" \
  CARGO_NET_OFFLINE="true" \
  EVAL_DIRECT_RSX_TARGET_DIR="$eval_root/platform/dioxus/target" \
  PLAYWRIGHT_BROWSERS_PATH="$playwright_browser_root" \
  EVAL_CODEX_HOME="$evaluation_auth_root" \
  EVAL_CODEX_WORKDIR="$evaluation_workdir" \
  EVAL_CODEX_BIN="$codex_command" \
  node src/run-canary.mjs --provider codex --output "$output_directory"

test "$(jq -r '.outcome' "$output_directory/summary.json")" = "PASS"
