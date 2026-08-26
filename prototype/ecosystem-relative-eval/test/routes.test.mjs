import assert from "node:assert/strict";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { routeUserPrompt, validateRoute } from "../src/routes.mjs";

test("runtime-uncertain routes accept equivalent choices outside the supplied contract", async () => {
  const scenarios = await buildScenarios();
  const profile = scenarios.find((scenario) => scenario.id === "01-validated-profile-v1");
  const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const openui = `root = Toolbar("profile-toolbar", "horizontal", [avatar, profile_label, profile_input, submit_button])
avatar = Avatar("profile-avatar", "Ada Lovelace · variant 1", "AL")
profile_label = Label("profile-name-label", "profile-name", "Profile name · variant 1")
profile_input = Input("profile-name", "Profile name · variant 1", "profile_name", "Ada-1", "Enter a name · variant 1")
submit_button = Button("profile-submit", "Save profile · variant 1", "SubmitProfile", "profile")`;
  const typedJson = JSON.stringify({
    root: "profile-toolbar",
    nodes: [
      { kind: "Toolbar", id: "profile-toolbar", orientation: "vertical", children: ["profile-avatar", "profile-name-label", "profile-name-input", "profile-submit"] },
      { kind: "Avatar", id: "profile-avatar", alt: "Ada Lovelace · variant 1", fallback: "AL" },
      { kind: "Label", id: "profile-name-label", for_id: "profile-name-input", text: "Profile name · variant 1" },
      { kind: "Input", id: "profile-name-input", label: "Profile name · variant 1", state_key: "profile_name", value: "Ada-1", placeholder: "Enter a name · variant 1" },
      { kind: "Button", id: "profile-submit", label: "Save profile · variant 1", action: "SubmitProfile", target_id: "profile" },
    ],
    state: { profile_name: "Ada-1" },
  });
  const jsonRender = [
    { op: "add", path: "/root", value: "preferences-toolbar" },
    { op: "add", path: "/elements/notifications-switch", value: { type: "Switch", props: { id: "notifications-switch", label: "Enable notifications · variant 1", state_key: "notifications_enabled", checked: { $bindState: "/notifications_enabled" } }, children: [] } },
    { op: "add", path: "/state/notifications_enabled", value: true },
    { op: "add", path: "/elements/terms-checkbox", value: { type: "Checkbox", props: { id: "terms-checkbox", label: "Accept terms · variant 1", state_key: "terms_accepted", checked: { $bindState: "/terms_accepted" } }, children: [] } },
    { op: "add", path: "/state/terms_accepted", value: false },
    { op: "add", path: "/elements/apply-preferences-button", value: { type: "Button", props: { id: "apply-preferences-button", label: "Apply preferences" }, on: { press: { action: "ApplyFilter", params: { target_id: "preferences" } } }, children: [] } },
    { op: "add", path: "/elements/preferences-toolbar", value: { type: "Toolbar", props: { id: "preferences-toolbar", orientation: "vertical" }, children: ["notifications-switch", "terms-checkbox", "apply-preferences-button"] } },
  ].map(JSON.stringify).join("\n");

  assert.equal((await validateRoute("openui", openui, profile, { cohort: "runtime-uncertain" })).ok, true);
  assert.equal((await validateRoute("typed-json", typedJson, profile, { cohort: "runtime-uncertain" })).ok, true);
  assert.equal((await validateRoute("json-render", jsonRender, preferences, { cohort: "runtime-uncertain" })).ok, true);
});

test("compile-known routes still enforce the frozen complete specification", async () => {
  const [profile] = await buildScenarios();
  const changed = structuredClone(profile.expected);
  changed.nodes.find((node) => node.kind === "Toolbar").orientation = "horizontal";
  const result = await validateRoute("typed-json", JSON.stringify(changed), profile, { cohort: "compile-known" });
  assert.equal(result.ok, false);
});

test("all structured route validators enforce the shared accessibility contract", async () => {
  const scenarios = await buildScenarios();
  const profile = scenarios.find((scenario) => scenario.id === "01-validated-profile-v1");
  const invalid = structuredClone(profile);
  invalid.expected.nodes.find((node) => node.kind === "Input").label = "";

  const typed = await validateRoute("typed-json", JSON.stringify(invalid.expected), invalid, { cohort: "compile-known" });
  assert.equal(typed.ok, false);
  assert.ok(typed.diagnostics.some((diagnostic) => diagnostic.code === "accessibility-contract"));
});

test("all route prompts keep host receipts out of Surface component coverage", async () => {
  const scenarios = await buildScenarios();
  const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const prompts = ["openui", "typed-json", "json-render", "direct-rsx"]
    .map((route) => routeUserPrompt(route, preferences, "runtime-uncertain"));

  assert.ok(prompts.every((prompt) => prompt.includes("HOST RECEIPT OWNERSHIP")));
  assert.ok(prompts.every((prompt) => prompt.includes("must not become a data-component")));
  assert.ok(prompts.every((prompt) => prompt.includes('"required":false')));
});

test("all route prompts explain route-neutral accessible component ownership", async () => {
  const scenarios = await buildScenarios();
  const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const prompts = ["openui", "typed-json", "json-render", "direct-rsx"]
    .map((route) => routeUserPrompt(route, preferences, "runtime-uncertain"));

  assert.ok(prompts.every((prompt) => prompt.includes("ROUTE-NEUTRAL ACCESSIBLE COMPONENT PATTERNS")));
  assert.ok(prompts.every((prompt) => prompt.includes("exactly one approved pattern")));
  assert.ok(prompts.every((prompt) => prompt.includes("Nested data-component roots and host receipts cannot satisfy their parent component")));
});

test("Preferences accepts its frozen component set and rejects invented Surface feedback", async () => {
  const scenarios = await buildScenarios();
  const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
  const accepted = await validateRoute("typed-json", JSON.stringify(preferences.expected), preferences, { cohort: "runtime-uncertain" });
  assert.equal(accepted.ok, true, JSON.stringify(accepted.diagnostics));

  const invented = structuredClone(preferences.expected);
  invented.nodes.push({ kind: "Toast", id: "invented_feedback", tone: "info", title: "Preferences", message: "Ready" });
  invented.nodes.find((node) => node.id === invented.root).children.push("invented_feedback");
  const rejected = await validateRoute("typed-json", JSON.stringify(invented), preferences, { cohort: "runtime-uncertain" });
  assert.equal(rejected.ok, false);
  assert.ok(rejected.diagnostics.some((diagnostic) => diagnostic.message === "component-kinds"));
});
