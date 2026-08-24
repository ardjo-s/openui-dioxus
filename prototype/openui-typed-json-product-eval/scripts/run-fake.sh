#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
catalog="$repo_root/prototype/dioxus-components-catalog-eval"
eval_root="$repo_root/prototype/openui-typed-json-product-eval"

npm ci --prefix "$catalog/generator" --ignore-scripts
npm ci --prefix "$eval_root" --ignore-scripts
cargo build --manifest-path "$catalog/Cargo.toml" --bin catalog-normalize
node "$eval_root/src/run.mjs" "$eval_root/evidence/fake-preflight"
