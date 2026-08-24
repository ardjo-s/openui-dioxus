#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { scoreEvaluation } from "./score.mjs";

const [resultsDir] = process.argv.slice(2);
if (!resultsDir) throw new Error("usage: summarize.mjs <results-dir>");
const readJson = async (name) => JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
const records = (await readFile(path.join(resultsDir, "records.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);
const summary = scoreEvaluation({
  records,
  generation: await readJson("generation.json"),
  platform: await readJson("platform.json"),
  loc: await readJson("adapter-loc.json"),
  runtimeDiff: (await readJson("runtime-diff.json")).lines_modified,
});
const tokenAdvantage = Number.isFinite(summary.median_raw_token_advantage)
  ? `${(summary.median_raw_token_advantage * 100).toFixed(1)}%`
  : "n/a";
const estimatedCost = Number.isFinite(summary.estimated_cost_usd)
  ? `$${summary.estimated_cost_usd.toFixed(4)}`
  : "n/a (ChatGPT plan; not API billing)";
await writeFile(path.join(resultsDir, "summary.json"), JSON.stringify(summary, null, 2));
await writeFile(
  path.join(resultsDir, "summary.md"),
  [
    "# OpenUI vs A2UI cloud evaluation",
    "",
    `**Pre-mobile outcome:** ${summary.pre_mobile_outcome}`,
    "",
    `- Complete pairs: ${summary.pairs_complete}/20`,
    `- OpenUI median raw-token advantage: ${tokenAdvantage}`,
    `- First-pass validity: OpenUI ${summary.first_pass_validity.openui}/20; A2UI ${summary.first_pass_validity.a2ui}/20`,
    `- Post-repair validity: OpenUI ${summary.post_repair_validity.openui}/20; A2UI ${summary.post_repair_validity.a2ui}/20`,
    `- Estimated cost: ${estimatedCost}`,
    `- Desktop: ${summary.criteria.desktop ? "PASS" : "FAIL"}`,
    `- Web: ${summary.criteria.web ? "PASS" : "FAIL"}`,
    `- Shared runtime lines changed by A2UI: ${summary.shared_runtime_lines_modified}`,
    "",
    "The reference semantics are official. Both Dioxus adapters are project-owned prototype code.",
    "",
  ].join("\n"),
);
console.log(JSON.stringify({ openui_wins: summary.openui_wins, outcome: summary.pre_mobile_outcome }));
