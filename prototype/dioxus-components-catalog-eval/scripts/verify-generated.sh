#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT

npm ci --prefix "$root/generator" --ignore-scripts >/dev/null
node "$root/generator/generate.mjs" "$temporary"
diff -ru "$root/generated" "$temporary"
(
  cd "$root/generated"
  sha256sum -c SHA256SUMS
)
