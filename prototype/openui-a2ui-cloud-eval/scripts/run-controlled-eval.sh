#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export EVAL_MODE=controlled
export EVAL_PAIRS=20
export EVAL_RESULTS_DIR=${EVAL_RESULTS_DIR:-$ROOT/results-controlled}
exec "$ROOT/scripts/run-local-eval.sh"
