import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { buildScenarios } from "./scenarios.mjs";
import { protocolArtifacts, protocolPrompt } from "./protocols.mjs";

const inputs = {
  node_manifest: new URL("../package.json", import.meta.url),
  node_lock: new URL("../package-lock.json", import.meta.url),
  scenarios: new URL("./scenarios.mjs", import.meta.url),
  protocols: new URL("./protocols.mjs", import.meta.url),
  provider: new URL("./provider.mjs", import.meta.url),
  codex_provider: new URL("../../openui-a2ui-cloud-eval/oracles/src/codex-provider.mjs", import.meta.url),
  scorer: new URL("./score.mjs", import.meta.url),
  runner: new URL("./run.mjs", import.meta.url),
  manifest: new URL("../../dioxus-components-catalog-eval/catalog/manifest.json", import.meta.url),
  openui_library: new URL("../../dioxus-components-catalog-eval/generated/openui-library.json", import.meta.url),
  typed_json_schema: new URL("../../dioxus-components-catalog-eval/generated/typed-json-schema.json", import.meta.url),
  catalog_adapter: new URL("../../dioxus-components-catalog-eval/src/lib.rs", import.meta.url),
  normalizer: new URL("../../dioxus-components-catalog-eval/src/bin/catalog-normalize.rs", import.meta.url),
};

export async function preregistration() {
  const scenarios = await buildScenarios();
  const release = JSON.parse(await readFile(new URL("../../dioxus-components-catalog-eval/generated/release.json", import.meta.url), "utf8"));
  const input_hashes = Object.fromEntries(await Promise.all(Object.entries(inputs).map(async ([name, url]) => [name, sha(await readFile(url))])));
  const protocol_hashes = Object.fromEntries(["openui", "typed-json"].map((protocol) => [protocol, sha(protocolPrompt(protocol))]));
  const scenario_hashes = scenarios.map((scenario) => ({ id: scenario.id, hash: sha(scenario.shared_prompt) }));
  const schedule = scenarios.map((scenario, index) => ({
    passage: index + 1,
    scenario_id: scenario.id,
    order: index % 2 === 0 ? ["openui", "typed-json"] : ["typed-json", "openui"],
  }));
  const frozen = {
    version: "ope-5-product-eval-v1",
    source_pins: {
      openui: "@openuidev/lang-core@0.2.15",
      json_schema_validator: "ajv@8.20.0",
      tokenizer: "tiktoken@1.0.22",
      catalog_release_hash: release.catalog_release_hash,
      dioxus_components_commit: protocolArtifacts.manifest.source.commit,
      dioxus: protocolArtifacts.manifest.source.resolved_dioxus_version,
    },
    model_configuration: {
      model: "gpt-5.6-luna",
      reasoning_effort: "low",
      provider: "codex-chatgpt-plan-local",
      fresh_ephemeral_process_per_attempt: true,
      tools_disabled: true,
      output_executed: false,
      maximum_response_bytes: 262144,
      maximum_calls: 80,
      maximum_repairs_per_arm: 1,
    },
    scoring: {
      pairs: 20,
      minimum_openui_post_repair_validity: 19,
      maximum_openui_validity_disadvantage: 1,
      maximum_openui_quality_disadvantage: 0.5,
      maximum_openui_maintenance_ratio: 1.25,
      material_advantage: {
        median_cumulative_raw_tokens: 0.20,
        first_pass_validity_percentage_points: 10,
        median_human_correction_time: 0.25,
      },
    },
    protocol_hashes,
    scenario_hashes,
    schedule,
    input_hashes,
  };
  return { ...frozen, hash: sha(JSON.stringify(frozen)) };
}

export function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}
