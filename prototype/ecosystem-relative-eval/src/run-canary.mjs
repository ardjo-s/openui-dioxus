#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { lstat, mkdir, open, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { get_encoding } from "tiktoken";

import { verifySecondCatalogFixtures } from "./catalog-fixtures.mjs";
import { PUBLICATION_MARKER } from "./evidence-publication.mjs";
import { measureImplementationFootprint } from "./footprint.mjs";
import { sha, stableJson } from "./hash.mjs";
import { buildCandidateManifest, hashManifest } from "./manifest.mjs";
import { normalizeWire } from "./normalizer.mjs";
import { verifyOpe3Archive } from "./ope3.mjs";
import { verifyPlatformEvidence } from "./platform-evidence.mjs";
import { executeGeneratedPlatformProofs } from "./platform-runner.mjs";
import { generateRouteOutput, repairPrompt } from "./provider.mjs";
import { routeExtension, validateRoute } from "./routes.mjs";
import { assertDecisionNeutral, scanEvidenceDirectory, scanProviderPayload } from "./security.mjs";
import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");
const maximumResponseBytes = 256 * 1024;

export async function runCanary({ provider, outputDirectory, platformProof = provider === "codex" ? "generated" : "reference" }) {
  if (!["fake", "codex"].includes(provider)) throw new Error(`unknown provider: ${provider}`);
  if (!["generated", "reference"].includes(platformProof)) throw new Error(`unknown platform proof mode: ${platformProof}`);
  if (provider === "codex" && platformProof !== "generated") throw new Error("real provider canary requires generated-output platform proof");
  await prepareOutputDirectory(outputDirectory);
  for (const directory of ["raw", "diagnostics", "native", "canonical", "provider-events", "provider-stderr", "traces"]) {
    await mkdir(path.join(outputDirectory, directory), { recursive: true });
  }
  const started = performance.now();
  const encoding = get_encoding("o200k_base");
  const manifest = await buildCandidateManifest();
  const manifestHash = hashManifest(manifest);
  const deadlineMs = started + manifest.canary.maximum_wall_time_ms;
  await writeJson(path.join(outputDirectory, "candidate-manifest.json"), { ...manifest, hash: manifestHash });
  await writeFile(path.join(outputDirectory, "candidate-manifest.sha256"), `${manifestHash}\n`, { flag: "wx", mode: 0o600 });
  const ope3Import = await verifyOpe3Archive();
  const secondCatalog = await verifySecondCatalogFixtures({ execute: true, deadlineMs });
  const scenarios = await buildScenarios();
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const records = [];
  const scanFindings = [];
  let providerError = null;

  try {
    for (const cell of manifest.canary.schedule) {
      if (performance.now() - started > manifest.canary.maximum_wall_time_ms) {
        providerError = "canary wall-time ceiling reached before next call";
        break;
      }
      const scenario = byId.get(cell.scenario_id.replace(/^compile-/, ""));
      if (!scenario) throw new Error(`missing scenario: ${cell.scenario_id}`);
      const prompt = manifest.canary.prompt_pack.find((entry) => entry.prompt_id === cell.prompt_id);
      if (!prompt) throw new Error(`missing frozen prompt: ${cell.prompt_id}`);
      const instructions = prompt.instructions;
      const initialUserPrompt = prompt.user_prompt;
      const initialScan = scanProviderPayload({ instructions, user_prompt: initialUserPrompt });
      scanFindings.push(...initialScan.map((finding) => ({ ...finding, scenario_id: cell.scenario_id, route: cell.route, attempt: 1 })));
      if (initialScan.length) {
        providerError = `pre-provider scan rejected ${cell.scenario_id}:${cell.route}`;
        break;
      }
      let prior = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const remainingProviderMs = remainingTime(deadlineMs);
        if (remainingProviderMs <= 0) {
          providerError = "canary wall-time ceiling reached before provider call";
          break;
        }
        if (records.length >= manifest.canary.maximum_provider_calls) {
          providerError = "maximum provider calls reached";
          break;
        }
        const userPrompt = attempt === 1
          ? initialUserPrompt
          : repairPrompt(initialUserPrompt, prior.output, prior.diagnostics);
        const payloadScan = scanProviderPayload({ instructions, user_prompt: userPrompt });
        scanFindings.push(...payloadScan.map((finding) => ({ ...finding, scenario_id: cell.scenario_id, route: cell.route, attempt })));
        if (payloadScan.length) {
          providerError = `repair payload scan rejected ${cell.scenario_id}:${cell.route}`;
          break;
        }
        const stem = `${String(records.length + 1).padStart(2, "0")}-${slug(cell.scenario_id)}-${cell.route}-attempt-${attempt}`;
        const rawPath = path.join(outputDirectory, "raw", `${stem}.${routeExtension(cell.route)}`);
        let generated;
        try {
          generated = await generateRouteOutput({
            provider,
            route: cell.route,
            scheduleScenarioId: cell.scenario_id,
            attempt,
            scenario,
            instructions,
            userPrompt,
            rawPath,
            maximumResponseBytes,
            timeoutMs: remainingProviderMs,
          });
        } catch (error) {
          providerError = String(error.message);
          const failureOutput = typeof error.output === "string" ? error.output : "";
          const diagnosticsPath = path.join(outputDirectory, "diagnostics", `${stem}.json`);
          const eventsPath = path.join(outputDirectory, "provider-events", `${stem}.jsonl`);
          const stderrPath = path.join(outputDirectory, "provider-stderr", `${stem}.log`);
          await writeFile(rawPath, failureOutput, { flag: "wx", mode: 0o600 });
          await writeFile(eventsPath, error.eventsRaw ?? "", { flag: "wx", mode: 0o600 });
          await writeFile(stderrPath, error.stderr ?? "", { flag: "wx", mode: 0o600 });
          await writeJson(diagnosticsPath, {
            ok: false,
            diagnostics: [{ code: "provider-error", message: providerError, tool_activity: error.toolActivity ?? [] }],
          });
          records.push(providerFailureRecord({
            cell,
            scenario,
            attempt,
            instructions,
            userPrompt,
            message: providerError,
            encoding,
            output: failureOutput,
            responseBytes: error.outputBytes ?? Buffer.byteLength(failureOutput),
            providerMs: error.elapsedMs ?? 0,
            providerUsage: error.usage ?? null,
            rawSha256: sha(await readFile(rawPath)),
            diagnosticsSha256: sha(await readFile(diagnosticsPath)),
          }));
          break;
        }
        await writeFile(rawPath, generated.output, { flag: "wx", mode: 0o600 });
        if (generated.events_raw !== undefined) await writeFile(path.join(outputDirectory, "provider-events", `${stem}.jsonl`), generated.events_raw, { flag: "wx", mode: 0o600 });
        if (generated.stderr !== undefined) await writeFile(path.join(outputDirectory, "provider-stderr", `${stem}.log`), generated.stderr, { flag: "wx", mode: 0o600 });
        const responseBytes = generated.response_bytes ?? Buffer.byteLength(generated.output);
        const validationStarted = performance.now();
        let validation = responseBytes <= maximumResponseBytes
          ? await validateRoute(cell.route, generated.output, scenario, { deadlineMs })
          : { ok: false, diagnostics: [{ code: "output-too-large", message: `more than ${maximumResponseBytes} bytes` }] };
        let canonical = null;
        let oracleFingerprint = null;
        let normalizationMs = 0;
        if (validation.ok && validation.wire) {
          try {
            const normalized = await normalizeWire(validation.wire, path.join(outputDirectory, "canonical"), stem, deadlineMs);
            const oracle = await normalizeWire(scenario.expected, path.join(outputDirectory, "canonical"), `${stem}-oracle`, deadlineMs);
            canonical = normalized.canonical;
            validation.semantic_fingerprint = normalized.fingerprint;
            oracleFingerprint = oracle.fingerprint;
            normalizationMs = normalized.normalization_ms + oracle.normalization_ms;
            if (normalized.fingerprint !== oracle.fingerprint) {
              validation = { ok: false, diagnostics: [{ code: "canonical-fingerprint", message: "generated and oracle fingerprints differ" }] };
            }
          } catch (error) {
            validation = { ok: false, diagnostics: [{ code: "catalog-adapter", message: String(error.message) }] };
          }
        }
        const validationMs = performance.now() - validationStarted;
        const diagnosticsPath = path.join(outputDirectory, "diagnostics", `${stem}.json`);
        await writeJson(diagnosticsPath, { ok: validation.ok, diagnostics: validation.diagnostics });
        let nativePath = null;
        if (validation.ok && validation.route_artifact !== null && validation.route_artifact !== undefined && !validation.wire) {
          nativePath = path.join(outputDirectory, "native", `${stem}.${cell.route === "direct-rsx" ? "html" : "json"}`);
          await writeFile(nativePath, typeof validation.route_artifact === "string" ? validation.route_artifact : `${JSON.stringify(validation.route_artifact, null, 2)}\n`);
        }
        const record = {
          route: cell.route,
          cohort: cell.cohort,
          scenario_id: cell.scenario_id,
          source_scenario_id: scenario.id,
          family: scenario.family,
          order_position: cell.order_position,
          attempt,
          repaired: attempt === 2,
          accepted: validation.ok,
          diagnostics: validation.diagnostics,
          tokens: {
            raw_prompt_tokens: tokenCount(encoding, instructions) + tokenCount(encoding, userPrompt),
            raw_output_tokens: tokenCount(encoding, generated.output),
            usage_source: generated.usage_source,
            provider_usage: generated.provider_usage ?? null,
          },
          latency: {
            provider_ms: generated.provider_ms,
            validation_ms: validationMs,
            normalization_ms: normalizationMs,
            compile_ms: validation.compile_ms ?? 0,
            sandbox_run_ms: validation.run_ms ?? 0,
            full_response_ms: generated.provider_ms + validationMs,
          },
          response_bytes: responseBytes,
          semantic_fingerprint: validation.semantic_fingerprint ?? null,
          oracle_fingerprint: oracleFingerprint,
          canonical_surface: canonical,
          platform_artifact: validation.ok
            ? (cell.route === "direct-rsx" ? generated.output : (validation.wire ?? validation.route_artifact))
            : null,
          prompt_hashes: {
            instructions_sha256: sha(instructions),
            user_prompt_sha256: sha(userPrompt),
          },
          artifact_hashes: {
            raw_sha256: sha(await readFile(rawPath)),
            diagnostics_sha256: sha(await readFile(diagnosticsPath)),
            native_sha256: nativePath ? sha(await readFile(nativePath)) : null,
            canonical_sha256: canonical ? sha(JSON.stringify(canonical)) : null,
            platform_artifact_sha256: validation.ok
              ? sha(stableJson(cell.route === "direct-rsx" ? generated.output : (validation.wire ?? validation.route_artifact)))
              : null,
          },
        };
        records.push(record);
        if (record.accepted) break;
        prior = { output: generated.output, diagnostics: validation.diagnostics };
      }
      if (providerError) break;
    }
  } finally {
    encoding.free();
  }

  await writeFile(path.join(outputDirectory, "records.jsonl"), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, { flag: "wx", mode: 0o600 });
  const finalRecords = finalRecordsByCell(records);
  const routeCells = finalRecords.length;
  const allAccepted = routeCells === manifest.canary.schedule.length && finalRecords.every((record) => record.accepted);
  let platformEvidence;
  if (platformProof === "reference") {
    platformEvidence = { ...await verifyPlatformEvidence(), source: "frozen-reference-preflight" };
  } else if (!providerError && allAccepted) {
    try {
      platformEvidence = await executeGeneratedPlatformProofs({ records, outputDirectory, manifestHash, deadlineMs });
    } catch (error) {
      platformEvidence = {
        verified: false,
        source: "generated-canary-outputs",
        diagnostics: [{ code: "platform-runner", message: String(error.message) }],
        proofs: {},
        artifact_count: 0,
        recursive_sha256: null,
        executions: [],
      };
    }
  } else {
    platformEvidence = {
      verified: false,
      source: "not-executed-after-generation-failure",
      diagnostics: [{ code: "platform-runner", message: "provider outputs were not all accepted" }],
      proofs: {},
      artifact_count: 0,
      recursive_sha256: null,
      executions: [],
    };
  }
  const wallTimeMs = performance.now() - started;
  const publicationScanFindings = await scanEvidenceDirectory(outputDirectory);
  const runtimeDiffLines = canonicalRuntimeDiffLines();
  const implementationFootprint = await measureImplementationFootprint();
  const outcome = !providerError
    && allAccepted
    && records.length <= manifest.canary.maximum_provider_calls
    && wallTimeMs <= manifest.canary.maximum_wall_time_ms
    && ope3Import.verified
    && secondCatalog.verified
    && platformEvidence.verified
    && runtimeDiffLines === 0
    && scanFindings.length === 0
    && publicationScanFindings.length === 0
    ? "PASS"
    : "CANARY_INVALID";
  const summary = {
    outcome,
    execution_kind: provider === "fake" ? "deterministic-preflight" : "real-provider-canary",
    provider,
    model: manifest.provider.model,
    reasoning_effort: manifest.provider.reasoning_effort,
    manifest_hash: manifestHash,
    manifest_promoted: outcome === "PASS" && provider === "codex" && platformProof === "generated",
    route_cells: routeCells,
    calls: records.length,
    maximum_calls: manifest.canary.maximum_provider_calls,
    wall_time_ms: wallTimeMs,
    maximum_wall_time_ms: manifest.canary.maximum_wall_time_ms,
    first_pass_validity: validity(records, 1),
    post_repair_validity: validity(finalRecords),
    cumulative_raw_tokens: cumulativeTokens(records),
    balanced_order: balancedOrder(manifest.canary.schedule),
    rejected_attempts_retained_and_charged: records.filter((record) => !record.accepted).every((record) => record.tokens.raw_prompt_tokens > 0 && record.tokens.raw_output_tokens > 0),
    ope3_import: ope3Import,
    second_catalog: secondCatalog,
    platform_evidence: platformEvidence,
    platform_proof_mode: platformProof,
    canonical_runtime_behavior_diff_lines: runtimeDiffLines,
    trust_controls: {
      pre_provider_scan_findings: scanFindings.length,
      publication_credential_scan_findings: publicationScanFindings.length,
      generated_output_execution: {
        openui: "validated-data-only",
        "typed-json": "validated-data-only",
        "json-render": "validated-data-rendered-by-official-react-runtime",
        "direct-rsx": "sandboxed",
      },
      direct_rsx_sandbox: "compile plus macOS deny-network sandbox",
      effect_policy: "deny-by-default",
    },
    implementation_footprint: implementationFootprint,
    cost: {
      billing_basis: provider === "codex"
        ? "ChatGPT plan, no per-run API invoice or incremental dollar charge is available"
        : "ChatGPT plan is reserved for the real canary; deterministic fake provider uses no model calls",
      incremental_api_cost_usd: null,
      provider_usage: aggregateProviderUsage(records),
    },
    provider_error: providerError,
    final_product_scorer_accessed: false,
  };
  assertDecisionNeutral(summary);
  await writeJson(path.join(outputDirectory, "summary.json"), summary);
  await writeJson(path.join(outputDirectory, "credential-scan.json"), {
    passed: scanFindings.length === 0 && publicationScanFindings.length === 0,
    pre_provider_findings: scanFindings,
    publication_findings: publicationScanFindings,
  });
  await writeFile(path.join(outputDirectory, "REPORT.md"), report(summary), { flag: "wx", mode: 0o600 });
  const checksumManifestSha256 = await writeChecksums(outputDirectory);
  await writeJson(path.join(outputDirectory, PUBLICATION_MARKER), {
    status: "complete",
    outcome,
    manifest_hash: manifestHash,
    checksum_manifest_sha256: checksumManifestSha256,
  });
  return summary;
}

function providerFailureRecord({
  cell,
  scenario,
  attempt,
  instructions,
  userPrompt,
  message,
  encoding,
  output,
  responseBytes,
  providerMs,
  providerUsage,
  rawSha256,
  diagnosticsSha256,
}) {
  return {
    route: cell.route,
    cohort: cell.cohort,
    scenario_id: cell.scenario_id,
    source_scenario_id: scenario.id,
    family: scenario.family,
    order_position: cell.order_position,
    attempt,
    repaired: attempt === 2,
    accepted: false,
    diagnostics: [{ code: "provider-error", message }],
    tokens: {
      raw_prompt_tokens: tokenCount(encoding, instructions) + tokenCount(encoding, userPrompt),
      raw_output_tokens: tokenCount(encoding, output),
      usage_source: providerUsage?.usage_source ?? "provider-error-without-completed-usage",
      provider_usage: providerUsage,
    },
    latency: { provider_ms: providerMs, validation_ms: 0, normalization_ms: 0, compile_ms: 0, sandbox_run_ms: 0, full_response_ms: providerMs },
    response_bytes: responseBytes,
    semantic_fingerprint: null,
    oracle_fingerprint: null,
    canonical_surface: null,
    platform_artifact: null,
    prompt_hashes: { instructions_sha256: sha(instructions), user_prompt_sha256: sha(userPrompt) },
    artifact_hashes: { raw_sha256: rawSha256, diagnostics_sha256: diagnosticsSha256, native_sha256: null, canonical_sha256: null, platform_artifact_sha256: null },
  };
}

function remainingTime(deadlineMs) {
  return Math.max(0, Math.floor(deadlineMs - performance.now()));
}

function finalRecordsByCell(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.cohort}:${record.scenario_id}:${record.route}`;
    const current = groups.get(key);
    if (!current || record.attempt > current.attempt) groups.set(key, record);
  }
  return [...groups.values()];
}

function validity(records, attempt = null) {
  const selected = attempt === null ? records : records.filter((record) => record.attempt === attempt);
  return Object.fromEntries(["openui", "typed-json", "json-render", "direct-rsx"].map((route) => [route, selected.filter((record) => record.route === route && record.accepted).length]));
}

function cumulativeTokens(records) {
  return Object.fromEntries(["openui", "typed-json", "json-render", "direct-rsx"].map((route) => [route, records.filter((record) => record.route === route).reduce((total, record) => total + record.tokens.raw_prompt_tokens + record.tokens.raw_output_tokens, 0)]));
}

function aggregateProviderUsage(records) {
  const totals = {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    output_tokens: 0,
    reasoning_tokens: 0,
    total_tokens: 0,
  };
  let measuredRecords = 0;
  for (const record of records) {
    const usage = record.tokens.provider_usage;
    if (!usage) continue;
    measuredRecords += 1;
    for (const key of Object.keys(totals)) totals[key] += Number(usage[key] ?? 0);
  }
  return { measured_records: measuredRecords, ...totals };
}

function balancedOrder(schedule) {
  return ["openui", "typed-json", "json-render", "direct-rsx"].every((route) => {
    const positions = schedule.filter((cell) => cell.route === route).map((cell) => cell.order_position).sort();
    return JSON.stringify(positions) === JSON.stringify([0, 1]);
  });
}

function canonicalRuntimeDiffLines() {
  const result = spawnSync("git", [
    "diff",
    "--numstat",
    "codex/ope-10-rust-ui-catalog",
    "--",
    "prototype/openui-dioxus-preview",
    "prototype/openui-typed-json-product-eval",
    "prototype/openui-a2ui-cloud-eval/src/domain.rs",
    "prototype/openui-a2ui-cloud-eval/src/runtime.rs",
  ], { cwd: repo, encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(String(result.error?.message ?? result.stderr));
  return result.stdout.split("\n").filter(Boolean).reduce((total, line) => {
    const [added, removed] = line.split("\t");
    return total + Number(added) + Number(removed);
  }, 0);
}

function tokenCount(encoding, source) {
  return encoding.encode(source).length;
}

function slug(value) {
  return value.replace(/[^a-zA-Z0-9-]+/g, "-");
}

function report(summary) {
  return [
    "# OPE-11 ecosystem canary",
    "",
    `Outcome: ${summary.outcome}`,
    `Execution: ${summary.execution_kind}`,
    `Route cells: ${summary.route_cells}/8`,
    `Provider calls: ${summary.calls}/${summary.maximum_calls}`,
    `Manifest: ${summary.manifest_hash}`,
    `Frozen OPE-3 import: ${summary.ope3_import.verified ? "verified" : "failed"}`,
    `Second catalog fixtures: ${summary.second_catalog.verified ? "verified" : "failed"}`,
    `Platform evidence: ${summary.platform_evidence.verified ? "verified" : "failed"}`,
    `Canonical runtime behavior diff: ${summary.canonical_runtime_behavior_diff_lines} lines`,
    `Implementation footprint: ${summary.implementation_footprint.total.file_count} files, ${summary.implementation_footprint.total.nonblank_lines} nonblank lines`,
    `Version-control numstat: ${summary.implementation_footprint.version_control.added_lines} added, ${summary.implementation_footprint.version_control.removed_lines} removed`,
    `Untracked source files: ${summary.implementation_footprint.version_control.untracked_source_files.length}`,
    "",
    "| Category | Files | Nonblank lines |",
    "| --- | ---: | ---: |",
    ...Object.entries(summary.implementation_footprint.required_categories).map(([name, value]) => `| ${name} | ${value.file_count} | ${value.nonblank_lines} |`),
    "",
    `Cost basis: ${summary.cost.billing_basis}`,
    "",
    "This operational canary is decision-neutral. It can only permit or block the complete evidence run.",
    "",
  ].join("\n");
}

async function writeJson(destination, value) {
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

async function writeChecksums(directory) {
  const files = (await filesBelow(directory)).filter((relative) => !["SHA256SUMS", PUBLICATION_MARKER].includes(relative)).sort();
  const lines = await Promise.all(files.map(async (relative) => `${sha(await readFile(path.join(directory, relative)))}  ${relative}`));
  const contents = `${lines.join("\n")}\n`;
  await writeFile(path.join(directory, "SHA256SUMS"), contents, { flag: "wx", mode: 0o600 });
  return sha(contents);
}

async function prepareOutputDirectory(directory) {
  try {
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`unsafe canary output directory: ${directory}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await mkdir(directory, { mode: 0o700 });
  }
  if ((await readdir(directory)).length) throw new Error(`refusing to overwrite non-empty output directory: ${directory}`);
  const lock = await open(path.join(directory, ".ope11-write-lock"), "wx", 0o600);
  try {
    await lock.writeFile(`${JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() })}\n`);
  } finally {
    await lock.close();
  }
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

function parseCli(argv) {
  const options = { provider: null, outputDirectory: null, platformProof: null };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name === "--provider") options.provider = value;
    else if (name === "--output") options.outputDirectory = path.resolve(value);
    else if (name === "--platform-proof") options.platformProof = value;
    else throw new Error(`unknown argument: ${name}`);
    index += 1;
  }
  options.provider ??= "fake";
  options.platformProof ??= options.provider === "codex" ? "generated" : "reference";
  options.outputDirectory ??= path.join(root, "evidence", options.provider === "fake" ? "fake-canary" : "candidate-canary");
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseCli(process.argv.slice(2));
  await mkdir(options.outputDirectory, { recursive: true });
  try {
    const summary = await runCanary(options);
    process.stdout.write(`${summary.outcome}\n`);
  } catch (error) {
    const emergency = {
      outcome: "CANARY_INVALID",
      execution_kind: options.provider === "codex" ? "real-provider-canary" : "deterministic-preflight",
      provider: options.provider,
      infrastructure_error: String(error.message).slice(0, 2000),
      product_outcome_forbidden: true,
    };
    try {
      await writeFile(path.join(options.outputDirectory, "summary.json"), `${JSON.stringify(emergency, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
    }
    process.stdout.write("CANARY_INVALID\n");
    process.exitCode = 1;
  }
}
