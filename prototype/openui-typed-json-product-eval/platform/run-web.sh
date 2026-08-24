#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
catalog="$repo_root/prototype/dioxus-components-catalog-eval"
platform="$repo_root/prototype/openui-typed-json-product-eval/platform"
evidence=${OPE6_EVIDENCE_DIR:-$platform/evidence/platform-local}
dx_bin=${DIOXUS_CLI_BIN:-$(command -v dx)}
mkdir -p "$evidence/screenshots" "$evidence/traces"

cd "$catalog"
"$dx_bin" build --platform web --release --debug-symbols false --bin platform-app > "$evidence/traces/web-build.log" 2>&1
index=$(find "$catalog/target/dx" -name index.html -type f | head -1)
public=$(dirname "$index")
python3 -m http.server 4173 --bind 127.0.0.1 --directory "$public" > "$evidence/traces/web-server.log" 2>&1 &
server_pid=$!
cleanup() { kill "$server_pid" 2>/dev/null || true; }
trap cleanup EXIT
for _ in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:4173/ >/dev/null; then break; fi
  sleep 1
done

cd "$repo_root/prototype/openui-typed-json-product-eval"
OPE6_WEB_URL=http://127.0.0.1:4173 OPE6_EVIDENCE_DIR="$evidence" \
  npm exec -- playwright test --config "$platform/playwright.config.mjs" > "$evidence/traces/playwright.log" 2>&1

first="$evidence/screenshots/web-surface-01.png"
last="$evidence/screenshots/web-surface-40.png"
passed=false
if [ -s "$first" ] && [ -s "$last" ]; then passed=true; fi
jq -n --argjson passed "$passed" \
  '{platform:"web",passed:$passed,evidence_complete:$passed,surfaces:40,families:5,keyboard:true,axe:true,feedback_announcements:true}' > "$evidence/web.json"
[ "$passed" = true ]
