import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { buildA2UiPrompt } from "./a2ui.mjs";
import { buildSharedScenarioPrompt, controlledScenarios } from "./controlled-scenarios.mjs";
import { buildOpenUiPrompt } from "./openui.mjs";

export function buildControlledPromptPack() {
  const sourcePins = {
    openui: "c3c0d1b7cf1d58e01846e86b7e9706f54afb2511/@openuidev/lang-core@0.2.15",
    a2ui: "f5baf760d23a5b21ba05a97f7d16d6db73fb8af6/v0.9.1/@a2ui/web_core@0.10.6",
    dioxus: "57d6794ad60b949e5bd8aa282f6f8c3dc97a365e/0.7.10",
  };
  const scoring = {
    pairs: 20,
    maximum_calls: 80,
    maximum_repairs_per_arm: 1,
    minimum_post_repair_validity: 19,
    maximum_validity_disadvantage: 1,
    maximum_latency_ratio: 1.1,
    minimum_cumulative_raw_token_advantage: 0.3,
    maximum_adapter_loc_ratio: 1.25,
    shared_runtime_lines_modified: 0,
  };
  const inputHashes = Object.fromEntries(
    [
      ["scenario_manifest", "../../fixtures/controlled-scenarios.json"],
      ["a2ui_minimal_envelope", "../../fixtures/minimal-envelope.a2ui.json"],
      ["node_lock", "../package-lock.json"],
      ["rust_lock", "../../Cargo.lock"],
      ["controlled_scorer", "./controlled-score.mjs"],
    ].map(([name, relative]) => [name, sha256(readFileSync(new URL(relative, import.meta.url)))]),
  );
  const protocols = {
    openui: instructionEntry(buildOpenUiPrompt()),
    a2ui: instructionEntry(buildA2UiPrompt()),
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
  const hash = sha256(
    JSON.stringify({
      version: "controlled-prompt-pack-v1",
      protocol_hashes: Object.fromEntries(
        Object.entries(protocols).map(([name, value]) => [name, value.hash]),
      ),
      scenario_hashes: scenarios.map(({ id, shared_prompt_hash }) => ({ id, shared_prompt_hash })),
      source_pins: sourcePins,
      scoring,
      input_hashes: inputHashes,
    }),
  );
  return {
    version: "controlled-prompt-pack-v1",
    hash,
    source_pins: sourcePins,
    scoring,
    input_hashes: inputHashes,
    protocols,
    scenarios,
  };
}

function instructionEntry(instructions) {
  return { hash: sha256(instructions), instructions };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
