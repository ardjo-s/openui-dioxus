#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [resultsDir] = process.argv.slice(2);
if (!resultsDir) throw new Error("usage: three-arm-report.mjs <results-dir>");
const readJson = async (name) => JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
const summary = await readJson("summary.json");
const generation = await readJson("generation.json");
const preregistration = await readJson("preregistration.json");

const lines = [
  "# OPE-3 joint controlled evaluation report",
  "",
  `**Evidence status:** ${summary.outcome}`,
  `**Provider:** ${generation.fake_provider ? "FAKE PREFLIGHT — never decision-grade" : "ChatGPT-plan Codex CLI"}`,
  `**Model:** ${generation.model}, reasoning ${generation.reasoning_effort}`,
  `**Preregistration:** \`${preregistration.hash}\``,
  "",
  "## Primary verdicts",
  "",
  `- OpenUI-Dioxus vs A2UI-Dioxus: **${summary.pairwise.openui_vs_a2ui.outcome}**`,
  `- OpenUI-Dioxus vs JSON-Dioxus: **${summary.pairwise.openui_vs_typed_json.outcome}**`,
  "",
  `A2UI-Dioxus vs JSON-Dioxus is secondary context only: **${summary.pairwise.a2ui_vs_typed_json.outcome}**.`,
  "",
  "## Three-arm overview",
  "",
  "| Arm | First pass | After repair | Cumulative raw tokens | Median latency ms | Adapter/provenance LOC |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
  ...["openui", "a2ui", "typed-json"].map((arm) =>
    `| ${arm} | ${summary.first_pass_validity[arm]}/20 | ${summary.post_repair_validity[arm]}/20 | ${summary.arm_metrics[arm].cumulative_raw_tokens} | ${summary.arm_metrics[arm].median_latency_ms.toFixed(1)} | ${summary.loc[arm]} |`,
  ),
  "",
  `Completed scenarios: ${summary.pairs_complete}/20. Calls: ${summary.calls}/120 maximum. Accepted Surfaces: ${summary.accepted_surfaces}.`,
  "",
  "## Shared executable evidence",
  "",
  `- Runtime semantics: ${pass(summary.common_criteria.runtime_semantics)}`,
  `- Desktop: ${pass(summary.common_criteria.desktop)}`,
  `- Chromium Web: ${pass(summary.common_criteria.web)}`,
  `- Shared runtime behavior diff: ${pass(summary.common_criteria.shared_runtime_behavior_diff)} (${summary.shared_runtime_behavior_lines_modified} lines)`,
  `- Real provider evidence: ${pass(summary.common_criteria.real_provider)}`,
  "",
  "Every accepted representation crosses the same project-owned `ProtocolAdapter -> Surface` seam. Model output is validated as data and is never executed.",
  "",
  "## Pairwise uncertainty",
  "",
  ...pairIntervalLines("OpenUI minus A2UI", summary.pairwise.openui_vs_a2ui),
  ...pairIntervalLines("OpenUI minus typed JSON", summary.pairwise.openui_vs_typed_json),
  "",
  "These paired bootstrap intervals are descriptive. They do not alter the pre-registered hard thresholds.",
  "",
  "## OPE-1 replication",
  "",
  `- Historical outcome: ${summary.replication.historical_outcome}`,
  `- Fresh OpenUI-vs-A2UI outcome: ${summary.replication.fresh_outcome}`,
  `- Direction agrees: ${summary.replication.direction_agrees ? "YES" : "NO"}`,
  `- Historical post-repair validity: OpenUI ${summary.replication.historical_post_repair_validity.openui}/20; A2UI ${summary.replication.historical_post_repair_validity.a2ui}/20`,
  `- Fresh post-repair validity: OpenUI ${summary.replication.fresh_post_repair_validity.openui}/20; A2UI ${summary.replication.fresh_post_repair_validity.a2ui}/20`,
  "",
  "## Method boundary",
  "",
  "This is a closed eight-component protocol-generation benchmark. It does not decide OPE-2 or prove product value, design-system breadth, accessibility, iOS, Android, maintenance cost, or blinded UI quality.",
  "",
  "OpenUI and A2UI use pinned official reference semantics. Their Dioxus adapters and the strict typed-JSON baseline are project-owned evaluation code.",
  "",
  "The OPE-1 archive remains immutable and is checksum-verified before this run. Records bind preregistered prompt hashes to raw payload, diagnostics, and normalized Surface hashes; `SHA256SUMS` binds the final archive.",
  "",
];

await writeFile(path.join(resultsDir, "RUN-REPORT.md"), lines.join("\n"));
console.log(JSON.stringify({ report: path.join(resultsDir, "RUN-REPORT.md") }));

function pass(value) {
  return value ? "PASS" : "FAIL";
}

function pairIntervalLines(label, pair) {
  const tokens = pair.paired_intervals.raw_tokens_left_minus_right;
  const latency = pair.paired_intervals.latency_ms_left_minus_right;
  return [
    `- ${label} raw tokens: mean ${format(tokens.mean_delta)}, 95% [${format(tokens.low_95)}, ${format(tokens.high_95)}]`,
    `- ${label} latency ms: mean ${format(latency.mean_delta)}, 95% [${format(latency.low_95)}, ${format(latency.high_95)}]`,
  ];
}

function format(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "n/a";
}
