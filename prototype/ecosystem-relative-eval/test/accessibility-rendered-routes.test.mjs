import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { accessibilityContractForSurface, validateRenderedAccessibility } from "../src/accessibility-contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const catalogManifest = path.join(root, "dioxus-components-catalog-eval/Cargo.toml");

test("real Dioxus Components output satisfies the same twelve accessible patterns", async () => {
  const rendered = JSON.parse(execFileSync("cargo", [
    "run",
    "--quiet",
    "--manifest-path",
    catalogManifest,
    "--example",
    "render_accessibility_contract",
    "--features",
    "ssr",
  ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));
  const scenarios = await buildScenarios();
  const pairs = [
    ["01-profile", "01-validated-profile-v1"],
    ["02-preferences", "02-preferences-v1"],
    ["03-filter", "03-filter-action-v1"],
    ["04-progress-dialog", "04-status-dialog-v1"],
    ["05-tabs-feedback", "05-navigation-feedback-v1"],
  ];

  for (const [fixture, scenarioId] of pairs) {
    const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
    const result = validateRenderedAccessibility(rendered[fixture], accessibilityContractForSurface(scenario.expected));
    assert.equal(result.passed, true, `${fixture}: ${JSON.stringify(result.diagnostics)}`);
  }
});
