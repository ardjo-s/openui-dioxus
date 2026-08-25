#!/usr/bin/env bash
set -euo pipefail

version=0.7.10
case "$(uname -s)" in
  Linux) target=unknown-linux-gnu ;;
  Darwin) target=apple-darwin ;;
  *) echo "unsupported Dioxus CLI host: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64) architecture=x86_64 ;;
  arm64|aarch64) architecture=aarch64 ;;
  *) echo "unsupported Dioxus CLI architecture: $(uname -m)" >&2; exit 1 ;;
esac

asset="dx-${architecture}-${target}.tar.gz"
base="https://github.com/DioxusLabs/dioxus/releases/download/v${version}"
install_root=${DIOXUS_CLI_INSTALL_ROOT:-${RUNNER_TEMP:-/tmp}/dioxus-cli-${version}}
archive="$install_root/$asset"
checksum="$install_root/${asset%.tar.gz}.sha256"
mkdir -p "$install_root"
curl --fail --location --silent --show-error "$base/$asset" --output "$archive"
curl --fail --location --silent --show-error "$base/${asset%.tar.gz}.sha256" --output "$checksum"
expected=$(awk -v asset="$asset" '$2 == asset {print $1}' "$checksum")
actual=$(shasum -a 256 "$archive" | awk '{print $1}')
test -n "$expected"
test "$actual" = "$expected"
tar -xzf "$archive" -C "$install_root"
dx_bin=$(find "$install_root" -type f -name dx -perm -u+x | head -1)
test -n "$dx_bin"
"$dx_bin" --version
if [ -n "${GITHUB_PATH:-}" ]; then echo "$(dirname "$dx_bin")" >> "$GITHUB_PATH"; fi
if [ -n "${GITHUB_ENV:-}" ]; then echo "DIOXUS_CLI_BIN=$dx_bin" >> "$GITHUB_ENV"; fi
