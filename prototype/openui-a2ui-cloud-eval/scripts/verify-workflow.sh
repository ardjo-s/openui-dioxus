#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
WORKFLOW=$(git -C "$ROOT" rev-parse --show-toplevel)/.github/workflows/prototype-cloud-eval.yml
test -f "$WORKFLOW"
grep -q 'codex/prototype-openui-a2ui-cloud-eval' "$WORKFLOW"
grep -q "contains(github.event.head_commit.message, '\[cloud-eval\]')" "$WORKFLOW"
grep -q 'contents: read' "$WORKFLOW"
grep -q 'environment: prototype-cloud-eval' "$WORKFLOW"
if grep -q 'pull_request:' "$WORKFLOW"; then
  echo 'pull_request trigger is forbidden' >&2
  exit 1
fi
jq -e '.sources[] | select(.name == "OpenUI") | .headAtFetch == "c3c0d1b7cf1d58e01846e86b7e9706f54afb2511"' \
  "$(git -C "$ROOT" rev-parse --show-toplevel)/sources.json" >/dev/null
echo 'workflow-contract=ok'
