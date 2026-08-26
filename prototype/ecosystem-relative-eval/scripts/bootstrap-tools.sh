#!/usr/bin/env bash
set -euo pipefail

eval_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ope5_root="$eval_root/../openui-typed-json-product-eval"
catalog_generator_root="$eval_root/../dioxus-components-catalog-eval/generator"
direct_probe_root="$eval_root/fixtures/direct-rsx-probe"
dx_root="$eval_root/.tmp/dioxus-cli"
dx_bin="$dx_root/bin/dx"

cd "$eval_root"
if ! node --input-type=module -e 'await import("@playwright/test"); await import("@openuidev/lang-core"); await import("@json-render/core");' >/dev/null 2>&1; then npm ci; fi
if ! (cd "$ope5_root" && node --input-type=module -e 'await import("./src/protocols.mjs")') >/dev/null 2>&1; then
  npm ci --ignore-scripts --prefix "$ope5_root"
fi
if ! (cd "$catalog_generator_root" && node --input-type=module -e 'await import("./src/catalog-generator.mjs")') >/dev/null 2>&1; then
  npm ci --ignore-scripts --prefix "$catalog_generator_root"
fi
host_target=$(rustc -vV | sed -n 's/^host: //p')
if ! CARGO_NET_OFFLINE=true cargo fetch --locked --target "$host_target" --manifest-path "$direct_probe_root/Cargo.toml" >/dev/null 2>&1; then
  cargo fetch --locked --target "$host_target" --manifest-path "$direct_probe_root/Cargo.toml"
fi
if [ ! -x "$dx_bin" ]; then
  mkdir -p "$dx_root"
  cargo install dioxus-cli --version 0.7.10 --locked --root "$dx_root"
fi
"$dx_bin" --version | grep -F "dioxus 0.7.10 (57d6794)" >/dev/null
npx playwright install chromium >/dev/null
