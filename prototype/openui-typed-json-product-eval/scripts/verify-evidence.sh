#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
evidence="$repo_root/prototype/openui-typed-json-product-eval/evidence/fake-preflight"

(cd "$evidence" && sha256sum -c SHA256SUMS)
node -e '
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (summary.evidence_status !== "FAKE_PREFLIGHT_NON_DECISION_GRADE") throw new Error("evidence label drift");
if (summary.pairs_complete !== 20 || summary.calls > 80) throw new Error("run topology failed");
if (summary.post_repair_validity.openui !== 20 || summary.post_repair_validity["typed-json"] !== 20) throw new Error("repair preflight failed");
if (summary.semantic_coverage_passages.openui !== 20 || summary.semantic_coverage_passages["typed-json"] !== 20) throw new Error("semantic coverage failed");
if (summary.mechanical_repair_count.openui !== 2 || summary.mechanical_repair_count["typed-json"] !== 2) throw new Error("repair topology drift");
if (!summary.identical_pair_fingerprints) throw new Error("canonical pair mismatch");
if (summary.shared_runtime_behavior_diff_lines !== 0) throw new Error("shared runtime changed");
' "$evidence/summary.json"
