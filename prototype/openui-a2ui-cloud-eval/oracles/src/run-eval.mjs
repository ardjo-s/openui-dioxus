#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";
import { get_encoding } from "tiktoken";

import { buildA2UiPrompt, validateA2Ui } from "./a2ui.mjs";
import { buildCodexPrompt, buildRepairPrompt } from "./attempt-prompt.mjs";
import { generateWithCodex } from "./codex-provider.mjs";
import { coverageFor } from "./controlled-coverage.mjs";
import { buildControlledPromptPack } from "./controlled-prompt-pack.mjs";
import { controlledScenarios } from "./controlled-scenarios.mjs";
import { buildOpenUiPrompt, validateOpenUi } from "./openui.mjs";
import { buildThreeArmPromptPack } from "./three-arm-prompt-pack.mjs";
import { threeArmOrder } from "./three-arm-schedule.mjs";
import { buildTypedJsonPrompt, validateTypedJson } from "./typed-json.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const resultsDir = path.resolve(process.env.EVAL_RESULTS_DIR ?? path.join(root, "results"));
const binDir = path.resolve(process.env.EVAL_BIN_DIR ?? path.join(root, "target/release"));
const pairsRequested = Number(process.env.EVAL_PAIRS ?? 20);
const provider = process.env.EVAL_PROVIDER ?? "api";
const evaluationMode = process.env.EVAL_MODE ?? "eval0";
if (!["eval0", "controlled", "controlled-three-arm"].includes(evaluationMode)) {
  throw new Error(`unknown EVAL_MODE: ${evaluationMode}`);
}
const isControlled = evaluationMode !== "eval0";
const isThreeArm = evaluationMode === "controlled-three-arm";
if (!["api", "codex"].includes(provider)) throw new Error(`unknown EVAL_PROVIDER: ${provider}`);
const model = "gpt-5.6-luna";
const maxOutputTokens = provider === "api" ? 8192 : null;
const maxCalls = isThreeArm ? 120 : 80;
const budgetUsd = provider === "api" ? 2 : null;
const maxResponseBytes = Number(process.env.EVAL_MAX_RESPONSE_BYTES ?? 256 * 1024);
if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1) {
  throw new Error(`invalid EVAL_MAX_RESPONSE_BYTES: ${process.env.EVAL_MAX_RESPONSE_BYTES}`);
}
const sharedIntent = await readFile(path.join(root, "fixtures/shared-intent.txt"), "utf8");
const controlledPromptPack = isThreeArm
  ? buildThreeArmPromptPack()
  : evaluationMode === "controlled"
    ? buildControlledPromptPack()
    : null;
const encoding = get_encoding("o200k_base");
const client = provider === "api" ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const codexHome = process.env.EVAL_CODEX_HOME;
const codexWorkDir = process.env.EVAL_CODEX_WORKDIR;
if (provider === "codex" && (!codexHome || !codexWorkDir)) {
  throw new Error("EVAL_CODEX_HOME and EVAL_CODEX_WORKDIR are required for the local provider");
}

let calls = 0;
let estimatedCostUsd = provider === "api" ? 0 : null;
let providerError = null;
const records = [];
const acceptedSurfaces = [];

await mkdir(path.join(resultsDir, "raw"), { recursive: true });
await mkdir(path.join(resultsDir, "diagnostics"), { recursive: true });
await mkdir(path.join(resultsDir, "surfaces"), { recursive: true });
await mkdir(path.join(resultsDir, "provider-events"), { recursive: true });
await mkdir(path.join(resultsDir, "provider-stderr"), { recursive: true });
if (controlledPromptPack) {
  await writeFile(
    path.join(resultsDir, "preregistration.json"),
    JSON.stringify(controlledPromptPack, null, 2),
  );
}

for (let passage = 1; passage <= pairsRequested && !providerError; passage += 1) {
  const order = isThreeArm
    ? threeArmOrder(passage)
    : passage % 2 === 1
      ? ["openui", "a2ui"]
      : ["a2ui", "openui"];
  for (const [orderPosition, protocol] of order.entries()) {
    const final = await runProtocol(passage, protocol, orderPosition);
    if (final?.surface) acceptedSurfaces.push(final.surface);
    if (final?.providerError) {
      providerError = final.providerError;
      break;
    }
  }
}

encoding.free();
await writeFile(
  path.join(resultsDir, "records.jsonl"),
  records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""),
);
await writeFile(path.join(resultsDir, "surfaces.json"), JSON.stringify(acceptedSurfaces, null, 2));
await writeFile(
  path.join(resultsDir, "generation.json"),
  JSON.stringify(
    {
      model,
      provider,
      billing_mode: provider === "api" ? "openai-api" : "chatgpt-plan",
      reasoning_effort: "low",
      store: provider === "api" ? false : "ephemeral-codex-session",
      max_output_tokens: maxOutputTokens,
      max_response_bytes: maxResponseBytes,
      pairs_requested: pairsRequested,
      evaluation_mode: evaluationMode,
      fake_provider: process.env.EVAL_FAKE_PROVIDER === "true",
      preregistration_verified: controlledPromptPack !== null,
      prompt_pack_hash: controlledPromptPack?.hash ?? null,
      calls,
      max_calls: maxCalls,
      estimated_cost_usd: estimatedCostUsd,
      budget_usd: budgetUsd,
      api_billing_metrics_available: provider === "api",
      provider_error: providerError,
      accepted_surfaces: acceptedSurfaces.length,
      local_isolation:
        provider === "codex"
          ? {
              fresh_process_per_attempt: true,
              ephemeral: true,
              ignore_user_config: true,
              ignore_rules: true,
              sandbox: "read-only",
              tools_disabled: true,
            }
          : null,
      source_pins: {
        openui: "c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/@openuidev/lang-core@0.2.15",
        a2ui: "f5baf760d23a5b21ba05a97f7d16d6db73fb8af6/v0.9.1/@a2ui/web_core@0.10.6",
        typed_json: isThreeArm ? controlledPromptPack.source_pins.typed_json : null,
        dioxus: "57d6794ad60b949e5bd8aa282f6f8c3dc97a365e/0.7.10",
      },
    },
    null,
    2,
  ),
);

runBinary("validate-records", [path.join(resultsDir, "records.jsonl")]);
console.log(JSON.stringify({ status: providerError ? "provider-error" : "complete", calls, accepted: acceptedSurfaces.length }));

async function runProtocol(passage, protocol, orderPosition) {
  const scenario = isControlled ? controlledScenarios[passage - 1] : null;
  if (isControlled && !scenario) {
    return { providerError: `missing controlled scenario for passage ${passage}` };
  }
  const systemPrompt = controlledPromptPack
    ? controlledPromptPack.protocols[protocol].instructions
    : protocol === "openui"
      ? buildOpenUiPrompt()
      : protocol === "a2ui"
        ? buildA2UiPrompt()
        : buildTypedJsonPrompt();
  const scenarioPrompt = controlledPromptPack
    ? controlledPromptPack.scenarios[passage - 1].shared_prompt
    : sharedIntent;
  let repairContext = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const userPrompt =
      attempt === 1
        ? scenarioPrompt
        : buildRepairPrompt(scenarioPrompt, repairContext.output, repairContext.diagnostics);
    const providerPrompt =
      provider === "codex" ? buildCodexPrompt(systemPrompt, userPrompt) : null;
    const promptTokens =
      provider === "codex"
        ? tokenCount(providerPrompt)
        : tokenCount(systemPrompt) + tokenCount(userPrompt);
    const worstNextCost =
      provider === "api" ? estimateCost(promptTokens, maxOutputTokens) : null;
    if (
      calls >= maxCalls ||
      (provider === "api" && estimatedCostUsd + worstNextCost > budgetUsd)
    ) {
      const message = "hard call or cost cap reached before request";
      records.push(
        providerFailureRecord(protocol, passage, orderPosition, attempt, promptTokens, message),
      );
      return { providerError: message };
    }

    const stem = `${String(passage).padStart(2, "0")}-${protocol}-attempt-${attempt}`;
    const extension = protocol === "openui" ? "openui" : "json";
    const rawPath = path.join(resultsDir, "raw", `${stem}.${extension}`);
    const diagnosticsPath = path.join(resultsDir, "diagnostics", `${stem}.json`);
    calls += 1;
    let providerMs;
    let output;
    let responseBytes;
    let usage;
    try {
      if (provider === "api") {
        const apiStarted = performance.now();
        const response = await client.responses.create({
          model,
          instructions: systemPrompt,
          input: userPrompt,
          reasoning: { effort: "low" },
          store: false,
          max_output_tokens: maxOutputTokens,
        });
        providerMs = performance.now() - apiStarted;
        output = response.output_text ?? extractOutputText(response.output);
        responseBytes = Buffer.byteLength(output);
        const rawOutputTokens = tokenCount(output);
        usage = normalizeUsage(response.usage, promptTokens, rawOutputTokens);
        estimatedCostUsd += usage.estimated_cost_usd;
      } else {
        const result = generateWithCodex({
          prompt: providerPrompt,
          outputPath: rawPath,
          codexHome,
          cwd: codexWorkDir,
          command: process.env.EVAL_CODEX_BIN ?? "codex",
          model,
          reasoningEffort: "low",
          maxResponseBytes,
          timeoutMs: Number(process.env.EVAL_CODEX_TIMEOUT_MS ?? 180_000),
        });
        providerMs = result.elapsedMs;
        output = result.output;
        responseBytes = result.outputBytes;
        usage = result.usage;
        await writeFile(path.join(resultsDir, "provider-events", `${stem}.jsonl`), result.eventsRaw);
        await writeFile(path.join(resultsDir, "provider-stderr", `${stem}.log`), result.stderr);
      }
    } catch (error) {
      const message = String(error?.message ?? error);
      if (provider === "codex") {
        await writeFile(
          path.join(resultsDir, "provider-events", `${stem}.jsonl`),
          error?.eventsRaw ?? "",
        );
        await writeFile(
          path.join(resultsDir, "provider-stderr", `${stem}.log`),
          error?.stderr ?? "",
        );
      }
      await writeFile(
        diagnosticsPath,
        JSON.stringify({ ok: false, diagnostics: [{ code: "provider-error", message }] }, null, 2),
      );
      records.push(
        providerFailureRecord(protocol, passage, orderPosition, attempt, promptTokens, message),
      );
      return { providerError: message };
    }
    const rawOutputTokens = tokenCount(output);

    const validationStarted = performance.now();
    let validation =
      responseBytes > maxResponseBytes
        ? {
            ok: false,
            diagnostics: [
              { code: "output-too-large", message: `response exceeds ${maxResponseBytes} bytes` },
            ],
          }
        : protocol === "openui"
          ? validateOpenUi(output)
          : protocol === "a2ui"
            ? validateA2Ui(output)
            : validateTypedJson(output);
    const validationMs = performance.now() - validationStarted;

    if (provider === "api") await writeFile(rawPath, output);
    await writeFile(diagnosticsPath, JSON.stringify(validation, null, 2));

    let normalizationMs = 0;
    let firstRenderMs = 0;
    let fingerprint = null;
    let coverage = null;
    let runtimeProbe = null;
    let surface = null;
    let surfacePath = null;
    if (validation.ok) {
      try {
        surfacePath = path.join(resultsDir, "surfaces", `${stem}.json`);
        const normalizationStarted = performance.now();
        const oraclePath = diagnosticsPath;
        runBinary(`normalize-${protocol}`, [oraclePath, rawPath, surfacePath]);
        normalizationMs = performance.now() - normalizationStarted;
        const renderStarted = performance.now();
        const render = JSON.parse(runBinary("render-once", [surfacePath]));
        firstRenderMs = performance.now() - renderStarted;
        surface = JSON.parse(await readFile(surfacePath, "utf8"));
        fingerprint = render.fingerprint;
        coverage = coverageFor(surface, render, scenario);
        runtimeProbe = JSON.parse(runBinary("runtime-probe", [surfacePath]));
      } catch (error) {
        validation = {
          ...validation,
          ok: false,
          diagnostics: [
            ...(validation.diagnostics ?? []),
            { code: "adapter-or-render-error", message: String(error?.message ?? error) },
          ],
        };
        surface = null;
        await writeFile(diagnosticsPath, JSON.stringify(validation, null, 2));
      }
    }

    const artifactHashes = {
      raw_output_sha256: sha256(await readFile(rawPath)),
      diagnostics_sha256: sha256(await readFile(diagnosticsPath)),
      surface_sha256: surfacePath && surface ? sha256(await readFile(surfacePath)) : null,
    };

    const record = {
      protocol,
      order_position: orderPosition,
      provider,
      passage,
      scenario_id: scenario?.id ?? `eval0-${passage}`,
      scenario_family: scenario?.family ?? "eval0",
      scenario_variant: scenario?.variant ?? passage,
      attempt,
      accepted: Boolean(validation.ok && coverage?.passed && runtimeProbePassed(runtimeProbe)),
      repaired: attempt === 2,
      diagnostics: validation.diagnostics ?? [],
      tokens: {
        raw_prompt_tokens: promptTokens,
        raw_output_tokens: rawOutputTokens,
        ...usage,
      },
      latency: {
        api_ms: provider === "api" ? providerMs : null,
        provider_ms: providerMs,
        validation_ms: validationMs,
        normalization_ms: normalizationMs,
        first_render_ms: firstRenderMs,
        full_response_ms:
          providerMs + validationMs + normalizationMs + firstRenderMs,
      },
      response_bytes: responseBytes,
      fingerprint,
      coverage,
      runtime_probe: runtimeProbe,
      provider_error: null,
      prompt_hashes: {
        system_prompt_sha256: sha256(systemPrompt),
        shared_prompt_sha256: sha256(scenarioPrompt),
        user_prompt_sha256: sha256(userPrompt),
        provider_prompt_sha256: providerPrompt ? sha256(providerPrompt) : null,
      },
      artifact_hashes: artifactHashes,
    };
    records.push(record);
    console.log(JSON.stringify({ passage, protocol, attempt, accepted: record.accepted }));
    if (record.accepted) return { record, surface };
    if (attempt === 1) {
      repairContext = { output, diagnostics: validation.diagnostics ?? [] };
    }
  }
  return { record: records.at(-1), surface: null };
}

function providerFailureRecord(protocol, passage, orderPosition, attempt, promptTokens, message) {
  return {
    protocol,
    order_position: orderPosition,
    provider,
    passage,
    attempt,
    accepted: false,
    repaired: attempt === 2,
    diagnostics: [{ code: "provider-error", message }],
    tokens: {
      raw_prompt_tokens: promptTokens,
      raw_output_tokens: 0,
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
      reasoning_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: provider === "api" ? 0 : null,
      usage_source: provider === "api" ? "openai-api" : "codex-cli-chatgpt-plan",
    },
    latency: {
      api_ms: provider === "api" ? 0 : null,
      provider_ms: 0,
      validation_ms: 0,
      normalization_ms: 0,
      first_render_ms: 0,
      full_response_ms: 0,
    },
    response_bytes: 0,
    fingerprint: null,
    coverage: null,
    runtime_probe: null,
    provider_error: message,
  };
}

function normalizeUsage(usage, fallbackInput, fallbackOutput) {
  const input = usage?.input_tokens ?? fallbackInput;
  const output = usage?.output_tokens ?? fallbackOutput;
  return {
    input_tokens: input,
    cached_input_tokens: usage?.input_tokens_details?.cached_tokens ?? 0,
    cache_write_input_tokens: 0,
    output_tokens: output,
    reasoning_tokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? input + output,
    estimated_cost_usd: estimateCost(input, output),
    usage_source: "openai-api",
  };
}

function tokenCount(text) {
  return encoding.encode(text).length;
}

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * 0.2 + outputTokens * 1.2) / 1_000_000;
}

function extractOutputText(output = []) {
  return output
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("");
}

function runBinary(name, args) {
  const executable = path.join(binDir, name);
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    env: { ...process.env, RUST_BACKTRACE: "0" },
  });
  if (result.status !== 0) {
    throw new Error(`${name} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function runtimeProbePassed(probe) {
  return (
    probe?.state_preserved === true &&
    probe?.action_exactly_once === true &&
    probe?.replay_same_fingerprint === true &&
    probe?.replay_effect_count === 0
  );
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
