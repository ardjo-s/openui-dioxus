#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { scoreEvaluation } from "./score.mjs";
import { scoreControlledEvaluation } from "./controlled-score.mjs";
import { buildControlledPromptPack } from "./controlled-prompt-pack.mjs";
import { validateControlledRecordTopology } from "./controlled-record-topology.mjs";

const [resultsDir] = process.argv.slice(2);
if (!resultsDir) throw new Error("usage: summarize.mjs <results-dir>");
const readJson = async (name) => JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
const generation = await readJson("generation.json");
if (generation.evaluation_mode === "controlled") {
  const preregistration = await readJson("preregistration.json");
  const current = buildControlledPromptPack();
  generation.preregistration_verified =
    preregistration.hash === generation.prompt_pack_hash && current.hash === generation.prompt_pack_hash;
}
const records = (await readFile(path.join(resultsDir, "records.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);
if (generation.evaluation_mode === "controlled") {
  const topology = validateControlledRecordTopology(records, generation);
  if (!topology.ok) throw new Error(`invalid controlled record topology: ${topology.diagnostics.join("; ")}`);
}
const score = generation.evaluation_mode === "controlled" ? scoreControlledEvaluation : scoreEvaluation;
const summary = score({
  records,
  generation,
  platform: await readJson("platform.json"),
  loc: await readJson("adapter-loc.json"),
  runtimeDiff: (await readJson("runtime-diff.json")).lines_modified,
});
const controlled = generation.evaluation_mode === "controlled";
const rawTokenAdvantage = controlled
  ? 1 -
    summary.protocol_metrics.openui.cumulative_raw_tokens /
      summary.protocol_metrics.a2ui.cumulative_raw_tokens
  : summary.median_raw_token_advantage;
const tokenAdvantage = Number.isFinite(rawTokenAdvantage)
  ? `${(rawTokenAdvantage * 100).toFixed(1)}%`
  : "n/a";
const estimatedCost = Number.isFinite(summary.estimated_cost_usd)
  ? `$${summary.estimated_cost_usd.toFixed(4)}`
  : "n/a (ChatGPT plan; not API billing)";
const criteria = summary.criteria ?? summary.common_criteria;
await writeFile(path.join(resultsDir, "summary.json"), JSON.stringify(summary, null, 2));
await writeFile(
  path.join(resultsDir, "summary.md"),
  [
    controlled
      ? "# OPE-1 controlled protocol-generation evaluation"
      : `# OpenUI vs A2UI ${generation.provider === "codex" ? "local ChatGPT-plan" : "cloud API"} evaluation`,
    "",
    `**Outcome:** ${summary.outcome ?? summary.pre_mobile_outcome}`,
    "",
    `- Complete pairs: ${summary.pairs_complete}/20`,
    `- OpenUI ${controlled ? "cumulative" : "median"} raw-token advantage: ${tokenAdvantage}`,
    `- First-pass validity: OpenUI ${summary.first_pass_validity.openui}/20; A2UI ${summary.first_pass_validity.a2ui}/20`,
    `- Post-repair validity: OpenUI ${summary.post_repair_validity.openui}/20; A2UI ${summary.post_repair_validity.a2ui}/20`,
    `- Estimated cost: ${estimatedCost}`,
    `- Desktop: ${criteria.desktop ? "PASS" : "FAIL"}`,
    `- Web: ${criteria.web ? "PASS" : "FAIL"}`,
    `- Shared runtime lines changed by A2UI: ${summary.shared_runtime_lines_modified}`,
    "",
    "The reference semantics are official. Both Dioxus adapters are project-owned prototype code.",
    ...(controlled
      ? [
          "",
          "Scope: one closed eight-component Dioxus catalog with gpt-5.6-luna at low reasoning.",
          "This is a protocol-generation result, not a product verdict; direct typed JSON remains OPE-2.",
        ]
      : []),
    "",
  ].join("\n"),
);
console.log(
  JSON.stringify({
    winner: summary.winner ?? (summary.openui_wins ? "openui" : null),
    outcome: summary.outcome ?? summary.pre_mobile_outcome,
  }),
);
