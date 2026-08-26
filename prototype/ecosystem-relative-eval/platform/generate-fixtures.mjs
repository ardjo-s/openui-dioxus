import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { sha, stableJson } from "../src/hash.mjs";
import { surfaceToJsonRenderSpec } from "../src/json-render-route.mjs";
import { buildPlatformProvenance } from "../src/platform-provenance.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, "fixtures");

export async function generatePlatformFixtures() {
  const scenarios = await buildScenarios();
  const reactScenario = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const dioxusScenarios = ["01-validated-profile-v1", "02-preferences-v1"].map((id) => scenarios.find((scenario) => scenario.id === id));
  const reactRecord = {
    route: "json-render",
    source_scenario_id: reactScenario.id,
    platform_artifact: surfaceToJsonRenderSpec(reactScenario.expected),
  };
  const react = {
    provenance: buildPlatformProvenance("frozen-reference-fixtures-v1", [reactRecord]),
    scenario_id: reactScenario.id,
    family: reactScenario.family,
    spec: reactRecord.platform_artifact,
  };
  const dioxusRecords = dioxusScenarios.map((scenario, index) => ({
    route: index === 0 ? "openui" : "typed-json",
    source_scenario_id: scenario.id,
    platform_artifact: scenario.expected,
  }));
  const dioxus = {
    provenance: buildPlatformProvenance("frozen-reference-fixtures-v1", dioxusRecords),
    entries: dioxusScenarios.map((scenario, index) => ({
      route: index === 0 ? "openui" : "typed-json",
      scenario_id: scenario.id,
      family: scenario.family,
      surface: scenario.expected,
    })),
  };
  await mkdir(fixtures, { recursive: true });
  const reactPath = path.join(fixtures, "json-render-spec.json");
  const dioxusPath = path.join(fixtures, "dioxus-surfaces.json");
  await writeFile(reactPath, `${JSON.stringify(react, null, 2)}\n`);
  await writeFile(dioxusPath, `${JSON.stringify(dioxus, null, 2)}\n`);
  return {
    react: reactPath,
    dioxus: dioxusPath,
    react_sha256: sha(stableJson(react)),
    dioxus_sha256: sha(stableJson(dioxus)),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generatePlatformFixtures();
}
