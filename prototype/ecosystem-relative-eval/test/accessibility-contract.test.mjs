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

  assert.equal(contract.version, "ope-15-route-neutral-patterns-v1");
  assert.deepEqual(contract.routes, ["openui", "typed-json", "json-render", "direct-rsx"]);
  assert.equal(validateStructuredAccessibility(filter.expected, contract).passed, true);

  const html = `<main data-route="direct-rsx">
    <div id="filter_toolbar" data-component="Toolbar" role="toolbar" aria-label="Filter controls">
      <label for="role_select">Role · variant 1</label>
      <select id="role_select" data-component="Select"><option>All</option></select>
      <button id="filter_button" data-component="Button">Apply · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;
  assert.deepEqual(validateRenderedAccessibility(html, contract), { passed: true, diagnostics: [] });
});

test("Toolbar accepts the horizontal ARIA default but requires an explicit vertical orientation", async () => {
  const scenarios = await buildScenarios();
  const feedback = scenarios.find((scenario) => scenario.id === "05-navigation-feedback-v1");
  const contract = accessibilityContractForSurface(feedback.expected);
  const html = `<main>
    <div id="navigation_toolbar" data-component="Toolbar" role="toolbar" aria-label="Navigation">
      <div id="account_tabs" data-component="Tabs">
        <div role="tablist" aria-label="Account views">
          <button role="tab" aria-selected="true" aria-controls="activity_panel">Activity · variant 1</button>
        </div>
        <div id="activity_panel" role="tabpanel">
          <div id="saved_toast" data-component="Toast" role="status">Saved · variant 1 Your activity view is current. · variant 1</div>
        </div>
      </div>
      <button id="activity_button" data-component="Button">Refresh activity · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;

  const result = validateRenderedAccessibility(html, contract);
  assert.equal(result.passed, false);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "aria-orientation" && diagnostic.component === "Toolbar"));
});

test("a marked component may own its accessible control as a descendant", async () => {
  const scenarios = await buildScenarios();
  const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
  const contract = accessibilityContractForSurface(filter.expected);
  const html = `<main data-route="direct-rsx">
    <div id="filter_toolbar" data-component="Toolbar" role="toolbar" aria-label="Filter controls" aria-orientation="horizontal">
      <div id="role_select" data-component="Select">
        <label for="role_select_control">Role · variant 1</label>
        <select id="role_select_control"><option>All</option></select>
      </div>
      <button id="filter_button" data-component="Button">Apply · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;

  assert.deepEqual(validateRenderedAccessibility(html, contract), { passed: true, diagnostics: [] });
});

test("a rendered Label must stay associated with its declared control", async () => {
  const scenarios = await buildScenarios();
  const profile = scenarios.find((scenario) => scenario.id === "01-validated-profile-v1");
  const contract = accessibilityContractForSurface(profile.expected);
  const render = (target) => `<main>
    <div id="profile_toolbar" data-component="Toolbar" role="toolbar" aria-label="Profile" aria-orientation="vertical">
      <div id="profile_avatar" data-component="Avatar" role="img" aria-label="Ada Lovelace · variant 1">AL</div>
      <label id="name_label" data-component="Label" for="${target}">Profile name · variant 1</label>
      <input id="name_input" data-component="Input" aria-label="Profile name · variant 1">
      <button id="submit_button" data-component="Button">Save profile · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;

  assert.deepEqual(validateRenderedAccessibility(render("name_input"), contract), { passed: true, diagnostics: [] });
  const broken = validateRenderedAccessibility(render("missing_control"), contract);
  assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.code === "label-association" && diagnostic.component === "Label"));
});

test("Select accepts equivalent native and popup-listbox patterns", async () => {
  const scenarios = await buildScenarios();
  const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
  const contract = accessibilityContractForSurface(filter.expected);
  const selectRequirement = contract.components.find((component) => component.kind === "Select");
  assert.deepEqual(selectRequirement.patterns.map((pattern) => pattern.id), ["native-combobox", "popup-listbox"]);

  const html = `<main data-route="dioxus">
    <div id="filter_toolbar" data-component="Toolbar" role="toolbar" aria-label="Filter controls" aria-orientation="horizontal">
      <div id="role_select" data-component="Select">
        <button type="button" aria-label="Role · variant 1" aria-haspopup="listbox" aria-controls="role_select_list" aria-expanded="false">All</button>
      </div>
      <button id="filter_button" data-component="Button">Apply · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;

  assert.deepEqual(validateRenderedAccessibility(html, contract), { passed: true, diagnostics: [] });
});

test("the catalog freezes one route-neutral pattern set for all twelve components", async () => {
  const scenarios = await buildScenarios();
  const patternIds = new Map();
  for (const scenario of scenarios) {
    const contract = accessibilityContractForSurface(scenario.expected);
    for (const component of contract.components) patternIds.set(component.kind, component.patterns.map((pattern) => pattern.id));
  }

  assert.deepEqual(Object.fromEntries([...patternIds].sort(([left], [right]) => left.localeCompare(right))), {
    Avatar: ["image"],
    Button: ["button"],
    Checkbox: ["checkbox"],
    Dialog: ["dialog"],
    Input: ["textbox"],
    Label: ["label"],
    Progress: ["progressbar"],
    Select: ["native-combobox", "popup-listbox"],
    Switch: ["switch"],
    Tabs: ["tabset"],
    Toast: ["polite-status", "interactive-alert"],
    Toolbar: ["toolbar"],
  });
});

test("composite Tabs and interactive Toast patterns require their owned semantics", async () => {
  const scenarios = await buildScenarios();
  const feedback = scenarios.find((scenario) => scenario.id === "05-navigation-feedback-v1");
  const contract = accessibilityContractForSurface(feedback.expected);
  const render = ({ tabRole = "tab", alertRole = "alert", toastTabIndex = "0" } = {}) => `<main>
    <div id="navigation_toolbar" data-component="Toolbar" role="toolbar" aria-label="Navigation" aria-orientation="vertical">
      <div id="account_tabs" data-component="Tabs">
        <div role="tablist" aria-label="Account views">
          <button role="${tabRole}" aria-selected="true" aria-controls="activity_panel">Activity · variant 1</button>
        </div>
        <div id="activity_panel" role="tabpanel">
          <div id="saved_toast" data-component="Toast" role="alertdialog" aria-labelledby="saved_title"${toastTabIndex === null ? "" : ` tabindex="${toastTabIndex}"`}>
            <div role="${alertRole}"><strong id="saved_title">Saved · variant 1</strong><span>Your activity view is current. · variant 1</span></div>
          </div>
        </div>
      </div>
      <button id="activity_button" data-component="Button">Refresh activity · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;

  assert.deepEqual(validateRenderedAccessibility(render(), contract), { passed: true, diagnostics: [] });
  assert.ok(validateRenderedAccessibility(render({ tabRole: "button" }), contract).diagnostics
    .some((diagnostic) => diagnostic.code === "semantic-role" && diagnostic.component === "Tabs"));
  assert.ok(validateRenderedAccessibility(render({ alertRole: "group" }), contract).diagnostics
    .some((diagnostic) => diagnostic.code === "semantic-role" && diagnostic.component === "Toast"));
  assert.ok(validateRenderedAccessibility(render({ toastTabIndex: null }), contract).diagnostics
    .some((diagnostic) => diagnostic.code === "semantic-role" && diagnostic.component === "Toast"));
});

test("semantic witnesses cannot be ambiguous or borrowed from nested components", async () => {
  const scenarios = await buildScenarios();
  const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
  const contract = accessibilityContractForSurface(filter.expected);
  const shell = (select) => `<main>
    <div id="filter_toolbar" data-component="Toolbar" role="toolbar" aria-label="Filter controls" aria-orientation="horizontal">
      ${select}
      <button id="filter_button" data-component="Button">Apply · variant 1</button>
    </div>
    <p role="status" aria-live="polite" data-receipt="ready">ready</p>
  </main>`;

  const ambiguous = validateRenderedAccessibility(shell(`<div id="role_select" data-component="Select">
    <select aria-label="Role · variant 1"><option>All</option></select>
    <button type="button" aria-label="Role · variant 1" aria-haspopup="listbox" aria-controls="role_list" aria-expanded="false">All</button>
  </div>`), contract);
  assert.ok(ambiguous.diagnostics.some((diagnostic) => diagnostic.code === "semantic-pattern-ambiguous"));

  const borrowed = validateRenderedAccessibility(shell(`<div id="role_select" data-component="Select">
    <button id="nested_button" data-component="Button" role="combobox" aria-label="Role · variant 1">All</button>
  </div>`), contract);
  assert.ok(borrowed.diagnostics.some((diagnostic) => diagnostic.code === "semantic-role" && diagnostic.component === "Select"));
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
    <button id="notifications_switch" role="switch" aria-checked="false" tabindex="0" aria-label="Enable notifications" data-component="Switch"></button>
    <input id="terms_checkbox" type="checkbox" aria-label="Accept terms" data-component="Checkbox">
    <button id="preferences_button" data-component="Button">Save preferences</button>
  </div>`;

  const valid = validateRenderedAccessibility(`<main>${components}<p role="status" aria-live="polite" data-receipt="ready">ready</p></main>`, contract);
  assert.equal(valid.passed, true, JSON.stringify(valid.diagnostics));

  const missing = validateRenderedAccessibility(`<main>${components}</main>`, contract);
  assert.ok(missing.diagnostics.some((diagnostic) => diagnostic.code === "host-receipt"));

  const statelessSwitch = validateRenderedAccessibility(`<main>${components.replace(' aria-checked="false"', "")}<p role="status" aria-live="polite" data-receipt="ready">ready</p></main>`, contract);
  assert.ok(statelessSwitch.diagnostics.some((diagnostic) => diagnostic.code === "semantic-role" && diagnostic.component === "Switch"));

  const catalogOwned = validateRenderedAccessibility(`<main>${components}<p role="status" aria-live="polite" data-component="Toast" data-receipt="ready">ready</p></main>`, contract);
  assert.ok(catalogOwned.diagnostics.some((diagnostic) => diagnostic.code === "host-receipt-ownership"));
});
