import assert from "node:assert/strict";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import {
  accessibilityContractForSurface,
  validateRenderedAccessibility,
  validateStructuredAccessibility,
} from "../src/accessibility-contract.mjs";

test("the observable accessibility contract accepts equivalent structured and native semantics", async () => {
  const scenarios = await buildScenarios();
  const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
  const contract = accessibilityContractForSurface(filter.expected);

  assert.equal(contract.version, "ope-13-observable-accessibility-v1");
  assert.deepEqual(contract.routes, ["openui", "typed-json", "json-render", "direct-rsx"]);
  assert.equal(validateStructuredAccessibility(filter.expected, contract).passed, true);

  const html = `<main data-route="direct-rsx">
    <div id="filter_toolbar" data-component="Toolbar" role="toolbar" aria-label="Filter controls" aria-orientation="horizontal">
      <label for="role_select">Role · variant 1</label>
      <select id="role_select" data-component="Select"><option>All</option></select>
      <button id="filter_button" data-component="Button">Apply · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;
  assert.deepEqual(validateRenderedAccessibility(html, contract), { passed: true, diagnostics: [] });
});

test("the observable accessibility contract rejects the frozen OPE-11 ARIA defect", async () => {
  const scenarios = await buildScenarios();
  const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
  const contract = accessibilityContractForSurface(filter.expected);
  const invalid = `<main data-route="direct-rsx">
    <div id="filter_toolbar" data-component="Toolbar" aria-orientation="horizontal">
      <label for="role_select">Role · variant 1</label>
      <select id="role_select" data-component="Select"><option>All</option></select>
      <button id="filter_button" data-component="Button">Apply · variant 1</button>
    </div>
    <div role="status" data-receipt="ready">ready</div>
  </main>`;
  const result = validateRenderedAccessibility(invalid, contract);

  assert.equal(result.passed, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "aria-allowed-attr"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "semantic-role" && diagnostic.component === "Toolbar"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "feedback-announcement"));
});

test("the observable accessibility contract rejects missing names and duplicate ids", async () => {
  const scenarios = await buildScenarios();
  const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
  const contract = accessibilityContractForSurface(filter.expected);
  const invalid = `<main data-route="direct-rsx">
    <div id="filter_toolbar" data-component="Toolbar" role="toolbar" aria-orientation="horizontal">
      <select id="role_select" data-component="Select"><option>All</option></select>
      <button id="role_select" data-component="Button"></button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;
  const result = validateRenderedAccessibility(invalid, contract);

  assert.equal(result.passed, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "accessible-name"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "duplicate-id"));
});

test("structured routes cannot omit accessibility-bearing catalog values", async () => {
  const scenarios = await buildScenarios();
  const profile = scenarios.find((scenario) => scenario.id === "01-validated-profile-v1");
  const contract = accessibilityContractForSurface(profile.expected);
  const invalid = structuredClone(profile.expected);
  invalid.nodes.find((node) => node.kind === "Input").label = "";
  invalid.nodes.find((node) => node.kind === "Avatar").alt = "";

  const result = validateStructuredAccessibility(invalid, contract);
  assert.equal(result.passed, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "accessible-name" && diagnostic.component === "Input"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "accessible-name" && diagnostic.component === "Avatar"));
});
