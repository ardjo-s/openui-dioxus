#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { scoreEvaluation } from "./score.mjs";
import { scoreControlledEvaluation } from "./controlled-score.mjs";
import { buildControlledPromptPack } from "./controlled-prompt-pack.mjs";
import { validateControlledRecordTopology } from "./controlled-record-topology.mjs";
import { verifyThreeArmBindings } from "./evidence-bindings.mjs";
import { buildThreeArmPromptPack } from "./three-arm-prompt-pack.mjs";
import { validateThreeArmRecordTopology } from "./three-arm-record-topology.mjs";
import { scoreThreeArmEvaluation } from "./three-arm-score.mjs";

const [resultsDir] = process.argv.slice(2);
if (!resultsDir) throw new Error("usage: summarize.mjs <results-dir>");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = async (name) => JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
const generation = await readJson("generation.json");
const threeArm = generation.evaluation_mode === "controlled-three-arm";
let preregistration = null;
if (generation.evaluation_mode === "controlled" || threeArm) {
  preregistration = await readJson("preregistration.json");
  const current = threeArm ? buildThreeArmPromptPack() : buildControlledPromptPack();
  generation.preregistration_verified =
    preregistration.hash === generation.prompt_pack_hash && current.hash === generation.prompt_pack_hash;
}
const records = (await readFile(path.join(resultsDir, "records.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);
if (threeArm) await verifyThreeArmBindings(records, preregistration, resultsDir);
if (generation.evaluation_mode === "controlled" || threeArm) {
  const topology = threeArm
    ? validateThreeArmRecordTopology(records, generation)
    : validateControlledRecordTopology(records, generation);
  if (!topology.ok) throw new Error(`invalid controlled record topology: ${topology.diagnostics.join("; ")}`);
}
const score = threeArm
  ? scoreThreeArmEvaluation
  : generation.evaluation_mode === "controlled"
    ? scoreControlledEvaluation
    : scoreEvaluation;
const summary = score({
  records,
  generation,
  platform: await readJson("platform.json"),
  loc: await readJson("adapter-loc.json"),
  runtimeDiff: (await readJson("runtime-diff.json")).lines_modified,
});
if (threeArm) {
  const historical = JSON.parse(
    await readFile(path.join(root, "evidence/controlled-run-2026-08-24/summary.json"), "utf8"),
  );
  summary.replication = replicationComparison(historical, summary);
  await writeFile(path.join(resultsDir, "summary.json"), JSON.stringify(summary, null, 2));
  await writeFile(path.join(resultsDir, "summary.md"), threeArmMarkdown(summary));
  console.log(
    JSON.stringify({
      outcome: summary.outcome,
      openui_vs_a2ui: summary.pairwise.openui_vs_a2ui.outcome,
      openui_vs_typed_json: summary.pairwise.openui_vs_typed_json.outcome,
    }),
  );
  process.exit(0);
}
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

function threeArmMarkdown(summary) {
  const row = (arm) => {
    const metrics = summary.arm_metrics[arm];
    return `| ${arm} | ${summary.first_pass_validity[arm]}/20 | ${summary.post_repair_validity[arm]}/20 | ${metrics.cumulative_raw_tokens} | ${metrics.median_latency_ms.toFixed(1)} |`;
  };
  return [
    "# OPE-3 controlled three-arm protocol-generation evaluation",
    "",
    `**Evidence status:** ${summary.outcome}`,
    "",
    `- OpenUI-Dioxus vs A2UI-Dioxus: **${summary.pairwise.openui_vs_a2ui.outcome}**`,
    `- OpenUI-Dioxus vs JSON-Dioxus: **${summary.pairwise.openui_vs_typed_json.outcome}**`,
    `- A2UI-Dioxus vs JSON-Dioxus (secondary): **${summary.pairwise.a2ui_vs_typed_json.outcome}**`,
    "",
    "| Arm | First-pass validity | Post-repair validity | Cumulative raw tokens | Median repair-inclusive latency ms |",
    "| --- | ---: | ---: | ---: | ---: |",
    row("openui"),
    row("a2ui"),
    row("typed-json"),
    "",
    `- Complete three-arm scenarios: ${summary.pairs_complete}/20`,
    `- Accepted Surfaces rendered: ${summary.accepted_surfaces}`,
    `- Desktop: ${summary.common_criteria.desktop ? "PASS" : "FAIL"}`,
    `- Web: ${summary.common_criteria.web ? "PASS" : "FAIL"}`,
    `- Shared runtime behavior lines changed: ${summary.shared_runtime_behavior_lines_modified}`,
    "",
    "## OPE-1 replication comparison",
    "",
    `- Historical OPE-1: ${summary.replication.historical_outcome}`,
    `- Fresh OPE-3 OpenUI vs A2UI: ${summary.replication.fresh_outcome}`,
    `- Direction agrees: ${summary.replication.direction_agrees ? "YES" : "NO"}`,
    `- Historical post-repair validity: OpenUI ${summary.replication.historical_post_repair_validity.openui}/20; A2UI ${summary.replication.historical_post_repair_validity.a2ui}/20`,
    `- Fresh post-repair validity: OpenUI ${summary.replication.fresh_post_repair_validity.openui}/20; A2UI ${summary.replication.fresh_post_repair_validity.a2ui}/20`,
    "",
    "The OpenUI and A2UI reference semantics are official. All Dioxus adapters and the strict typed-JSON baseline are project-owned evaluation code.",
    "",
    "Scope: one closed eight-component protocol-generation benchmark. This is not the OPE-2 product verdict; real Dioxus Components breadth, blinded quality, maintenance, accessibility, iOS, and Android remain separate.",
    "",
  ].join("\n");
}

function replicationComparison(historical, fresh) {
  const freshOutcome = fresh.pairwise.openui_vs_a2ui.outcome;
  const normalizedFresh =
    freshOutcome === "OPENUI_WIN"
      ? "CONTROLLED_OPENUI_WIN"
      : freshOutcome === "OTHER_WIN"
        ? "CONTROLLED_A2UI_WIN"
        : freshOutcome === "TIE"
          ? "CONTROLLED_TIE"
          : "INVALID_EVAL";
  return {
    historical_outcome: historical.outcome,
    fresh_outcome: freshOutcome,
    direction_agrees: historical.outcome === normalizedFresh,
    historical_post_repair_validity: historical.post_repair_validity,
    fresh_post_repair_validity: {
      openui: fresh.post_repair_validity.openui,
      a2ui: fresh.post_repair_validity.a2ui,
    },
    historical_cumulative_raw_tokens: {
      openui: historical.protocol_metrics.openui.cumulative_raw_tokens,
      a2ui: historical.protocol_metrics.a2ui.cumulative_raw_tokens,
    },
    fresh_cumulative_raw_tokens: {
      openui: fresh.arm_metrics.openui.cumulative_raw_tokens,
      a2ui: fresh.arm_metrics.a2ui.cumulative_raw_tokens,
    },
  };
}
