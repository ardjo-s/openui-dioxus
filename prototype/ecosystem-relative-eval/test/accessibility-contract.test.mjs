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

  assert.equal(contract.version, "ope-14-feedback-ownership-v1");
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
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "host-receipt"));
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

test("Surface feedback and host receipts have separate ownership", async () => {
  const scenarios = await buildScenarios();
  const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const feedback = scenarios.find((scenario) => scenario.id === "05-navigation-feedback-v1");
  const preferencesContract = accessibilityContractForSurface(preferences.expected);
  const feedbackContract = accessibilityContractForSurface(feedback.expected);

  assert.deepEqual(preferencesContract.surface_feedback, {
    owner: "surface",
    required: false,
    component: null,
  });
  assert.deepEqual(preferencesContract.host_receipt, {
    owner: "host-harness",
    generated_component: false,
    role: "status",
    live: "polite",
    visible: true,
    exactly_once: true,
  });
  assert.equal(feedbackContract.surface_feedback.required, true);
  assert.equal(feedbackContract.surface_feedback.component, "Toast");
  assert.equal(validateStructuredAccessibility(preferences.expected, preferencesContract).passed, true);

  const inventedFeedback = structuredClone(preferences.expected);
  inventedFeedback.nodes.push({ kind: "Toast", id: "invented_feedback", tone: "info", title: "Saved", message: "Ready" });
  inventedFeedback.nodes.find((node) => node.id === inventedFeedback.root).children.push("invented_feedback");
  assert.equal(validateStructuredAccessibility(inventedFeedback, preferencesContract).passed, false);

  const missingRequiredFeedback = structuredClone(feedback.expected);
  missingRequiredFeedback.nodes = missingRequiredFeedback.nodes.filter((node) => node.kind !== "Toast");
  assert.equal(validateStructuredAccessibility(missingRequiredFeedback, feedbackContract).passed, false);
});

test("rendered host receipt is exactly once and outside component coverage", async () => {
  const scenarios = await buildScenarios();
  const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const contract = accessibilityContractForSurface(preferences.expected);
  const components = `<div id="preferences_toolbar" role="toolbar" aria-label="Preferences" aria-orientation="vertical" data-component="Toolbar">
    <button id="notifications_switch" role="switch" tabindex="0" aria-label="Enable notifications" data-component="Switch"></button>
    <input id="terms_checkbox" type="checkbox" aria-label="Accept terms" data-component="Checkbox">
    <button id="preferences_button" data-component="Button">Save preferences</button>
  </div>`;

  const valid = validateRenderedAccessibility(`<main>${components}<p role="status" aria-live="polite" data-receipt="ready">ready</p></main>`, contract);
  assert.equal(valid.passed, true, JSON.stringify(valid.diagnostics));

  const missing = validateRenderedAccessibility(`<main>${components}</main>`, contract);
  assert.ok(missing.diagnostics.some((diagnostic) => diagnostic.code === "host-receipt"));

  const catalogOwned = validateRenderedAccessibility(`<main>${components}<p role="status" aria-live="polite" data-component="Toast" data-receipt="ready">ready</p></main>`, contract);
  assert.ok(catalogOwned.diagnostics.some((diagnostic) => diagnostic.code === "host-receipt-ownership"));
});
