#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { get_encoding } from "tiktoken";

import { generateOutput, repairPrompt } from "./provider.mjs";
import { preregistration, sha } from "./preregister.mjs";
import { adapterLoc, protocolPrompt, semanticCoverage, validateProtocol } from "./protocols.mjs";
import { buildScenarios } from "./scenarios.mjs";
import { summarizePreflight } from "./score.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");
const results = path.resolve(process.argv[2] ?? path.join(root, "evidence/fake-preflight"));
const normalizer = path.resolve(process.env.OPE5_NORMALIZER ?? path.join(repo, "prototype/dioxus-components-catalog-eval/target/debug/catalog-normalize"));
const maxResponseBytes = 256 * 1024;
const provider = process.env.EVAL_PROVIDER ?? "fake";
if (!["fake", "codex"].includes(provider)) throw new Error(`unknown EVAL_PROVIDER: ${provider}`);
const encoding = get_encoding("o200k_base");
const scenarios = await buildScenarios();
const prereg = await preregistration();
const records = [];

await rm(results, { recursive: true, force: true });
for (const directory of ["raw", "diagnostics", "wire", "canonical", "provider-events", "provider-stderr"]) {
  await mkdir(path.join(results, directory), { recursive: true });
}
await writeJson("preregistration.json", prereg);

for (const schedule of prereg.schedule) {
  const scenario = scenarios[schedule.passage - 1];
  const expectedPath = path.join(results, "wire", `${pad(schedule.passage)}-expected.json`);
  const expectedCanonicalPath = path.join(results, "canonical", `${pad(schedule.passage)}-expected.json`);
  await writeFile(expectedPath, JSON.stringify(scenario.expected));
  const expectedFingerprint = normalize(expectedPath, expectedCanonicalPath);
  for (const [orderPosition, protocol] of schedule.order.entries()) {
    const instructions = protocolPrompt(protocol);
    let prior = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const userPrompt = attempt === 1
        ? scenario.shared_prompt
        : repairPrompt(scenario.shared_prompt, prior.output, prior.diagnostics);
      const stem = `${pad(schedule.passage)}-${protocol}-attempt-${attempt}`;
      const rawPath = path.join(results, "raw", `${stem}.${protocol === "openui" ? "openui" : "json"}`);
      const generated = generateOutput({ provider, protocol, passage: schedule.passage, attempt, scenario, instructions, userPrompt, rawPath, maxResponseBytes });
      const responseBytes = generated.response_bytes ?? Buffer.byteLength(generated.output);
      if (generated.events_raw !== undefined) await writeFile(path.join(results, "provider-events", `${stem}.jsonl`), generated.events_raw);
      if (generated.stderr !== undefined) await writeFile(path.join(results, "provider-stderr", `${stem}.log`), generated.stderr);
      const diagnosticsPath = path.join(results, "diagnostics", `${stem}.json`);
      const wirePath = path.join(results, "wire", `${stem}.json`);
      const canonicalPath = path.join(results, "canonical", `${stem}.json`);
      await writeFile(rawPath, generated.output);

      const validationStarted = performance.now();
      let validation = responseBytes <= maxResponseBytes
        ? validateProtocol(protocol, generated.output, scenario.expected.state)
        : { ok: false, diagnostics: [{ code: "output-too-large", message: `more than ${maxResponseBytes} bytes` }], wire: null };
      const validationMs = performance.now() - validationStarted;
      let fingerprint = null;
      let coverage = { passed: false, diagnostics: ["not-normalized"] };
      let normalizationMs = 0;
      if (validation.ok) {
        await writeFile(wirePath, JSON.stringify(validation.wire));
        const normalizationStarted = performance.now();
        try {
          fingerprint = normalize(wirePath, canonicalPath);
          coverage = semanticCoverage(validation.wire, scenario.expected);
        } catch (error) {
          validation = { ok: false, diagnostics: [...validation.diagnostics, { code: "catalog-adapter", message: String(error.message) }], wire: null };
        }
        normalizationMs = performance.now() - normalizationStarted;
      }
      if (validation.ok && !coverage.passed) {
        validation = { ok: false, diagnostics: coverage.diagnostics.map((message) => ({ code: "semantic-coverage", message })), wire: null };
      }
      await writeJsonPath(diagnosticsPath, { ok: validation.ok, diagnostics: validation.diagnostics });
      const record = {
        protocol,
        passage: schedule.passage,
        scenario_id: scenario.id,
        scenario_family: scenario.family,
        scenario_variant: scenario.variant,
        order_position: orderPosition,
        attempt,
        repaired: attempt === 2,
        accepted: validation.ok,
        diagnostics: validation.diagnostics,
        tokens: {
          raw_prompt_tokens: tokenCount(instructions) + tokenCount(userPrompt),
          raw_output_tokens: tokenCount(generated.output),
          usage_source: generated.usage_source,
          provider_usage: generated.provider_usage ?? null,
        },
        latency: {
          provider_ms: generated.provider_ms,
          validation_ms: validationMs,
          normalization_ms: normalizationMs,
          full_response_ms: generated.provider_ms + validationMs + normalizationMs,
        },
        response_bytes: responseBytes,
        fingerprint,
        semantic_coverage: coverage,
        oracle_fingerprint: expectedFingerprint,
        shared_contract_sha256: sha(JSON.stringify(scenario.shared_contract)),
        mechanical_repair_count: attempt === 2 ? 1 : 0,
        human_correction_count: 0,
        human_correction_ms: 0,
        prompt_hashes: {
          instructions_sha256: sha(instructions),
          shared_prompt_sha256: sha(scenario.shared_prompt),
          user_prompt_sha256: sha(userPrompt),
        },
        artifact_hashes: {
          raw_sha256: sha(await readFile(rawPath)),
          diagnostics_sha256: sha(await readFile(diagnosticsPath)),
          canonical_sha256: validation.ok ? sha(await readFile(canonicalPath)) : null,
        },
      };
      records.push(record);
      if (record.accepted) break;
      prior = { output: generated.output, diagnostics: validation.diagnostics };
    }
  }
}

encoding.free();
await writeFile(path.join(results, "records.jsonl"), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
const summary = {
  ...summarizePreflight(records),
  provider: provider === "fake" ? "deterministic-fake-provider" : "codex-chatgpt-plan-local",
  real_provider: provider === "codex",
  model_configuration: prereg.model_configuration,
  preregistration_hash: prereg.hash,
  adapter_loc: adapterLoc(),
  shared_runtime_behavior_diff_lines: runtimeDiff(),
};
await writeJson("summary.json", summary);
await writeFile(path.join(results, "REPORT.md"), report(summary));
if (provider === "fake") await compactFakeEvidence();
const evidenceFiles = (await filesBelow(results)).filter((name) => name !== "SHA256SUMS").sort();
await writeFile(path.join(results, "SHA256SUMS"), `${(await Promise.all(evidenceFiles.map(async (name) => `${sha(await readFile(path.join(results, name)))}  ${name}`))).join("\n")}\n`);
process.stdout.write(`${JSON.stringify(summary)}\n`);

function normalize(inputPath, outputPath) {
  const result = spawnSync(normalizer, [inputPath, outputPath], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `normalizer exited ${result.status}`);
  return result.stdout.trim();
}

function tokenCount(value) {
  return encoding.encode(value).length;
}

function runtimeDiff() {
  const result = spawnSync("git", ["diff", "--numstat", "ae10afb", "--", "prototype/openui-a2ui-cloud-eval/src/domain.rs", "prototype/openui-a2ui-cloud-eval/src/runtime.rs", "prototype/openui-a2ui-cloud-eval/src/catalog.rs"], { cwd: repo, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim().split("\n").filter(Boolean).reduce((total, line) => {
    const [added, removed] = line.split("\t");
    return total + Number(added) + Number(removed);
  }, 0);
}

function report(summary) {
  return [
    "# OPE-5 deterministic harness preflight",
    "",
    "**FAKE PREFLIGHT — NOT DECISION-GRADE PRODUCT EVIDENCE.**",
    "",
    `- Paired scenarios: ${summary.pairs_complete}/20`,
    `- Calls: ${summary.calls}/80 maximum`,
    `- First-pass validity: OpenUI ${summary.first_pass_validity.openui}/20; typed JSON ${summary.first_pass_validity["typed-json"]}/20`,
    `- Post-repair validity: OpenUI ${summary.post_repair_validity.openui}/20; typed JSON ${summary.post_repair_validity["typed-json"]}/20`,
    `- Pair fingerprints identical: ${summary.identical_pair_fingerprints ? "PASS" : "FAIL"}`,
    `- Semantic coverage: OpenUI ${summary.semantic_coverage_passages.openui}/20; typed JSON ${summary.semantic_coverage_passages["typed-json"]}/20`,
    `- Cumulative raw tokens: OpenUI ${summary.cumulative_raw_tokens.openui}; typed JSON ${summary.cumulative_raw_tokens["typed-json"]}`,
    `- Median full-response latency: OpenUI ${summary.median_full_response_ms.openui.toFixed(2)} ms; typed JSON ${summary.median_full_response_ms["typed-json"].toFixed(2)} ms`,
    `- Mechanical repairs: OpenUI ${summary.mechanical_repair_count.openui}; typed JSON ${summary.mechanical_repair_count["typed-json"]}`,
    `- Shared runtime behavior diff: ${summary.shared_runtime_behavior_diff_lines} lines`,
    `- Adapter LOC: OpenUI ${summary.adapter_loc.openui}; typed JSON ${summary.adapter_loc["typed-json"]}`,
    "",
    "This run validates scheduling, prompts, official/schema validation, repair topology, common Rust normalization, metrics, and evidence binding. It cannot justify GO, PIVOT, or NO_GO.",
    "",
  ].join("\n");
}

async function writeJson(name, value) {
  await writeJsonPath(path.join(results, name), value);
}

async function writeJsonPath(destination, value) {
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

async function compactFakeEvidence() {
  const keep = {
    raw: new Set([
      "01-openui-attempt-1.openui",
      "01-typed-json-attempt-1.json",
      "04-openui-attempt-1.openui",
      "04-openui-attempt-2.openui",
      "08-typed-json-attempt-1.json",
      "08-typed-json-attempt-2.json",
    ]),
    diagnostics: new Set([
      "01-openui-attempt-1.json",
      "01-typed-json-attempt-1.json",
      "04-openui-attempt-1.json",
      "04-openui-attempt-2.json",
      "08-typed-json-attempt-1.json",
      "08-typed-json-attempt-2.json",
    ]),
    wire: new Set(["01-expected.json", "01-openui-attempt-1.json", "01-typed-json-attempt-1.json"]),
    canonical: new Set(["01-expected.json", "01-openui-attempt-1.json", "01-typed-json-attempt-1.json"]),
  };
  for (const [directory, allowed] of Object.entries(keep)) {
    const parent = path.join(results, directory);
    for (const name of await readdir(parent)) {
      if (!allowed.has(name)) await rm(path.join(parent, name));
    }
  }
}
