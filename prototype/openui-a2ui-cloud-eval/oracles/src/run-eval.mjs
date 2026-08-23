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
import { buildOpenUiPrompt, validateOpenUi } from "./openui.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const resultsDir = path.resolve(process.env.EVAL_RESULTS_DIR ?? path.join(root, "results"));
const binDir = path.resolve(process.env.EVAL_BIN_DIR ?? path.join(root, "target/release"));
const pairsRequested = Number(process.env.EVAL_PAIRS ?? 20);
const model = "gpt-5.6-luna";
const maxOutputTokens = 8192;
const maxCalls = 80;
const budgetUsd = 2;
const maxResponseBytes = 256 * 1024;
const sharedIntent = await readFile(path.join(root, "fixtures/shared-intent.txt"), "utf8");
const encoding = get_encoding("o200k_base");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let calls = 0;
let estimatedCostUsd = 0;
let providerError = null;
const records = [];
const acceptedSurfaces = [];

await mkdir(path.join(resultsDir, "raw"), { recursive: true });
await mkdir(path.join(resultsDir, "diagnostics"), { recursive: true });
await mkdir(path.join(resultsDir, "surfaces"), { recursive: true });

for (let passage = 1; passage <= pairsRequested && !providerError; passage += 1) {
  const order = passage % 2 === 1 ? ["openui", "a2ui"] : ["a2ui", "openui"];
  for (const protocol of order) {
    const final = await runProtocol(passage, protocol);
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
      reasoning_effort: "low",
      store: false,
      max_output_tokens: maxOutputTokens,
      pairs_requested: pairsRequested,
      calls,
      max_calls: maxCalls,
      estimated_cost_usd: estimatedCostUsd,
      budget_usd: budgetUsd,
      provider_error: providerError,
      accepted_surfaces: acceptedSurfaces.length,
      source_pins: {
        openui: "c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/@openuidev/lang-core@0.2.15",
        a2ui: "f5baf760d23a5b21ba05a97f7d16d6db73fb8af6/v0.9.1/@a2ui/web_core@0.10.6",
        dioxus: "57d6794ad60b949e5bd8aa282f6f8c3dc97a365e/0.7.10",
      },
    },
    null,
    2,
  ),
);

runBinary("validate-records", [path.join(resultsDir, "records.jsonl")]);
console.log(JSON.stringify({ status: providerError ? "provider-error" : "complete", calls, accepted: acceptedSurfaces.length }));

async function runProtocol(passage, protocol) {
  const systemPrompt = protocol === "openui" ? buildOpenUiPrompt() : buildA2UiPrompt();
  let repairContext = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const userPrompt =
      attempt === 1
        ? sharedIntent
        : [
            sharedIntent,
            "REPAIR THE PREVIOUS INVALID PAYLOAD.",
            "Previous payload:",
            repairContext.output,
            "Official diagnostics:",
            JSON.stringify(repairContext.diagnostics),
            "Return only the corrected protocol payload.",
          ].join("\n\n");
    const promptTokens = tokenCount(systemPrompt) + tokenCount(userPrompt);
    const worstNextCost = estimateCost(promptTokens, maxOutputTokens);
    if (calls >= maxCalls || estimatedCostUsd + worstNextCost > budgetUsd) {
      const message = "hard call or cost cap reached before request";
      records.push(providerFailureRecord(protocol, passage, attempt, promptTokens, message));
      return { providerError: message };
    }

    calls += 1;
    const apiStarted = performance.now();
    let response;
    try {
      response = await client.responses.create({
        model,
        instructions: systemPrompt,
        input: userPrompt,
        reasoning: { effort: "low" },
        store: false,
        max_output_tokens: maxOutputTokens,
      });
    } catch (error) {
      const message = String(error?.message ?? error);
      records.push(providerFailureRecord(protocol, passage, attempt, promptTokens, message));
      return { providerError: message };
    }
    const apiMs = performance.now() - apiStarted;
    const output = response.output_text ?? extractOutputText(response.output);
    const responseBytes = Buffer.byteLength(output);
    const rawOutputTokens = tokenCount(output);
    const usage = normalizeUsage(response.usage, promptTokens, rawOutputTokens);
    estimatedCostUsd += usage.estimated_cost_usd;

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
          : validateA2Ui(output);
    const validationMs = performance.now() - validationStarted;

    const stem = `${String(passage).padStart(2, "0")}-${protocol}-attempt-${attempt}`;
    const extension = protocol === "openui" ? "openui" : "json";
    const rawPath = path.join(resultsDir, "raw", `${stem}.${extension}`);
    const diagnosticsPath = path.join(resultsDir, "diagnostics", `${stem}.json`);
    await writeFile(rawPath, output);
    await writeFile(diagnosticsPath, JSON.stringify(validation, null, 2));

    let normalizationMs = 0;
    let firstRenderMs = 0;
    let fingerprint = null;
    let coverage = null;
    let runtimeProbe = null;
    let surface = null;
    if (validation.ok) {
      try {
        const surfacePath = path.join(resultsDir, "surfaces", `${String(passage).padStart(2, "0")}-${protocol}.json`);
        const normalizationStarted = performance.now();
        const oraclePath = diagnosticsPath;
        runBinary(`normalize-${protocol}`, [oraclePath, rawPath, surfacePath]);
        normalizationMs = performance.now() - normalizationStarted;
        const renderStarted = performance.now();
        const render = JSON.parse(runBinary("render-once", [surfacePath]));
        firstRenderMs = performance.now() - renderStarted;
        surface = JSON.parse(await readFile(surfacePath, "utf8"));
        fingerprint = render.fingerprint;
        coverage = coverageFor(surface, render);
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

    const record = {
      protocol,
      passage,
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
        api_ms: apiMs,
        validation_ms: validationMs,
        normalization_ms: normalizationMs,
        first_render_ms: firstRenderMs,
        full_response_ms:
          apiMs + validationMs + normalizationMs + firstRenderMs,
      },
      response_bytes: responseBytes,
      fingerprint,
      coverage,
      runtime_probe: runtimeProbe,
      provider_error: null,
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

function providerFailureRecord(protocol, passage, attempt, promptTokens, message) {
  return {
    protocol,
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
      estimated_cost_usd: 0,
    },
    latency: {
      api_ms: 0,
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
    output_tokens: output,
    reasoning_tokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? input + output,
    estimated_cost_usd: estimateCost(input, output),
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

function coverageFor(surface, render) {
  const kinds = [...new Set(Object.values(surface.nodes).map((node) => node.kind))].sort();
  const expected = ["Alert", "Button", "Card", "Input", "Select", "Stack", "Table", "Text"];
  const table = Object.values(surface.nodes).find((node) => node.kind === "Table");
  const expenseIds = (table?.rows ?? []).map((row) => row.expense_id).sort();
  const passed =
    JSON.stringify(kinds) === JSON.stringify(expected) &&
    JSON.stringify(expenseIds) === JSON.stringify(["exp-001", "exp-002"]) &&
    surface.fields.review_note === "" &&
    surface.fields.status_filter === "pending" &&
    render.has_all_components === true;
  return { passed, kinds, expense_ids: expenseIds, node_count: Object.keys(surface.nodes).length };
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
