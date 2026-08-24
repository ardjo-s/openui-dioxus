import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { buildA2UiPrompt, validateA2Ui } from "./a2ui.mjs";
import { buildSharedScenarioPrompt, controlledScenarios } from "./controlled-scenarios.mjs";
import { buildOpenUiPrompt, validateOpenUi } from "./openui.mjs";
import { buildThreeArmSchedule } from "./three-arm-schedule.mjs";
import {
  buildTypedJsonPrompt,
  typedJsonMinimalExample,
  typedJsonSchema,
  validateTypedJsonSyntax,
} from "./typed-json.mjs";

export function buildThreeArmPromptPack() {
  validateFrozenExamples();
  const sourcePins = {
    openui: "c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/@openuidev/lang-core@0.2.15",
    a2ui: "f5baf760d23a5b21ba05a97f7d16d6db73fb8af6/v0.9.1/@a2ui/web_core@0.10.6",
    typed_json: `project-owned/typed-json-v1/${sha256(JSON.stringify(typedJsonSchema))}`,
    dioxus: "57d6794ad60b949e5bd8aa282f6f8c3dc97a365e/0.7.10",
  };
  const modelConfiguration = {
    model: "gpt-5.6-luna",
    reasoning_effort: "low",
    provider: "codex-chatgpt-plan-local",
    fresh_ephemeral_process_per_attempt: true,
    sandbox: "read-only",
    tools_disabled: true,
    maximum_response_bytes: 262144,
    output_executed: false,
  };
  const scoring = {
    scenarios: 20,
    arms: 3,
    required_first_attempts: 60,
    maximum_calls: 120,
    maximum_repairs_per_arm: 1,
    minimum_post_repair_validity: 19,
    maximum_validity_disadvantage: 1,
    maximum_latency_ratio: 1.1,
    minimum_cumulative_raw_token_advantage: 0.3,
    maximum_adapter_loc_ratio: 1.25,
    shared_runtime_behavior_lines_modified: 0,
  };
  const inputHashes = Object.fromEntries(
    [
      ["scenario_manifest", "../../fixtures/controlled-scenarios.json"],
      ["openui_reference", "../../fixtures/reference.openui"],
      ["a2ui_reference", "../../fixtures/reference.a2ui.json"],
      ["a2ui_minimal_envelope", "../../fixtures/minimal-envelope.a2ui.json"],
      ["typed_json_reference", "../../fixtures/reference.typed-json.json"],
      ["node_lock", "../package-lock.json"],
      ["node_manifest", "../package.json"],
      ["rust_lock", "../../Cargo.lock"],
      ["rust_manifest", "../../Cargo.toml"],
      ["dioxus_manifest", "../../Dioxus.toml"],
      ["openui_validator", "./openui.mjs"],
      ["a2ui_validator", "./a2ui.mjs"],
      ["typed_json_validator", "./typed-json.mjs"],
      ["controlled_scenario_builder", "./controlled-scenarios.mjs"],
      ["codex_provider", "./codex-provider.mjs"],
      ["attempt_prompt_builder", "./attempt-prompt.mjs"],
      ["prompt_pack_builder", "./three-arm-prompt-pack.mjs"],
      ["generation_driver", "./run-eval.mjs"],
      ["coverage_predicate", "./controlled-coverage.mjs"],
      ["summary_driver", "./summarize.mjs"],
      ["report_driver", "./three-arm-report.mjs"],
      ["evidence_binding_verifier", "./evidence-bindings.mjs"],
      ["three_arm_scorer", "./three-arm-score.mjs"],
      ["shared_score_helpers", "./score.mjs"],
      ["three_arm_topology", "./three-arm-record-topology.mjs"],
      ["three_arm_schedule", "./three-arm-schedule.mjs"],
      ["openui_adapter", "../../src/openui.rs"],
      ["a2ui_adapter", "../../src/a2ui.rs"],
      ["typed_json_adapter", "../../src/typed_json.rs"],
      ["library_exports", "../../src/lib.rs"],
      ["canonical_domain", "../../src/domain.rs"],
      ["evaluation_record", "../../src/eval.rs"],
      ["runtime", "../../src/runtime.rs"],
      ["runtime_probe", "../../src/bin/runtime-probe.rs"],
      ["catalog_renderer", "../../src/catalog.rs"],
      ["openui_normalizer", "../../src/bin/normalize-openui.rs"],
      ["a2ui_normalizer", "../../src/bin/normalize-a2ui.rs"],
      ["typed_json_normalizer", "../../src/bin/normalize-typed-json.rs"],
      ["record_validator", "../../src/bin/validate-records.rs"],
      ["ssr_renderer", "../../src/bin/render-once.rs"],
      ["platform_app", "../../src/bin/eval-app.rs"],
      ["openui_cli", "./openui-cli.mjs"],
      ["a2ui_cli", "./a2ui-cli.mjs"],
      ["typed_json_cli", "./typed-json-cli.mjs"],
      ["playwright_config", "../playwright.config.mjs"],
      ["web_runtime_test", "../test/web-runtime.spec.mjs"],
      ["local_runner", "../../scripts/run-local-eval.sh"],
      ["three_arm_runner", "../../scripts/run-three-arm-controlled-eval.sh"],
      ["desktop_runner", "../../scripts/run-desktop.sh"],
      ["web_runner", "../../scripts/run-web.sh"],
      ["desktop_window_probe", "../../scripts/find-macos-window-id.swift"],
      ["loc_measurement", "../../scripts/measure-code.sh"],
      ["historical_ope1_summary", "../../evidence/controlled-run-2026-08-24/summary.json"],
      ["historical_ope1_checksums", "../../evidence/controlled-run-2026-08-24/SHA256SUMS"],
      ["standards_review", "../../reviews/ope-3-standards.md"],
      ["intent_review", "../../reviews/ope-3-intent.md"],
    ].map(([name, relative]) => [name, sha256(readFileSync(new URL(relative, import.meta.url)))]),
  );
  const protocols = {
    openui: instructionEntry(buildOpenUiPrompt()),
    a2ui: instructionEntry(buildA2UiPrompt()),
    "typed-json": instructionEntry(buildTypedJsonPrompt()),
  };
  const scenarios = controlledScenarios.map((scenario) => {
    const sharedPrompt = buildSharedScenarioPrompt(scenario);
    return {
      id: scenario.id,
      family: scenario.family,
      variant: scenario.variant,
      shared_prompt_hash: sha256(sharedPrompt),
      shared_prompt: sharedPrompt,
    };
  });
  const schedule = buildThreeArmSchedule();
  const hash = sha256(
    JSON.stringify({
      version: "ope-3-three-arm-v1",
      protocol_hashes: Object.fromEntries(
        Object.entries(protocols).map(([name, value]) => [name, value.hash]),
      ),
      scenario_hashes: scenarios.map(({ id, shared_prompt_hash }) => ({ id, shared_prompt_hash })),
      schedule,
      source_pins: sourcePins,
      model_configuration: modelConfiguration,
      scoring,
      input_hashes: inputHashes,
    }),
  );
  return {
    version: "ope-3-three-arm-v1",
    hash,
    source_pins: sourcePins,
    model_configuration: modelConfiguration,
    scoring,
    input_hashes: inputHashes,
    protocols,
    scenarios,
    schedule,
  };
}

function validateFrozenExamples() {
  const openui = readFileSync(new URL("../../fixtures/reference.openui", import.meta.url), "utf8");
  const a2ui = readFileSync(
    new URL("../../fixtures/minimal-envelope.a2ui.json", import.meta.url),
    "utf8",
  );
  if (!validateOpenUi(openui).ok) throw new Error("frozen OpenUI reference is invalid");
  if (!validateA2Ui(a2ui).ok) throw new Error("frozen A2UI minimal example is invalid");
  if (!validateTypedJsonSyntax(typedJsonMinimalExample).success) {
    throw new Error("frozen typed-JSON minimal example is invalid");
  }
}

function instructionEntry(instructions) {
  return { hash: sha256(instructions), instructions };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
