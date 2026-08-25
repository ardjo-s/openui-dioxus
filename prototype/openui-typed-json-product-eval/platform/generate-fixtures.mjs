#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { buildScenarios } from "../src/scenarios.mjs";

const fixtureRoot = new URL("./fixtures/", import.meta.url);
const scenarios = await buildScenarios();
const entries = scenarios.flatMap((scenario, index) => ["openui", "typed-json"].map((protocol) => ({
  protocol,
  passage: index + 1,
  scenario_id: scenario.id,
  family: scenario.family,
  surface: scenario.expected,
})));
const manifest = JSON.parse(await readFile(new URL("../../dioxus-components-catalog-eval/catalog/manifest.json", import.meta.url), "utf8"));
const profile = {
  version: "ope-6-platform-profile-v1",
  execution_model: {
    web: "browser DOM",
    desktop: "Dioxus desktop WebView",
    ios: "Dioxus mobile WebView on iOS Simulator",
    android: "Dioxus mobile WebView on Android Emulator",
  },
  semantic_invariants: ["identity", "value", "state", "typed action", "update", "replay"],
  components: Object.fromEntries(manifest.components.map((component) => [component.name, {
    accessibility: component.accessibility,
    adaptations: component.platform_adaptations,
  }])),
  fallbacks: {
    Dialog: "Catalog-declared WebView dialog; mobile may use a bounded full-height sheet presentation without changing state or action semantics.",
    responsive_layout: "Toolbar may wrap or become vertical below 640px; declared child order and focus order remain unchanged.",
    native_widgets: "Not claimed. Desktop and Mobile use Dioxus WebView semantics for this prototype.",
  },
};

await mkdir(fixtureRoot, { recursive: true });
await writeFile(new URL("surfaces.json", fixtureRoot), `${JSON.stringify(entries)}\n`);
await writeFile(new URL("platform-profile.json", fixtureRoot), `${JSON.stringify(profile, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ surfaces: entries.length, families: new Set(entries.map((entry) => entry.family)).size })}\n`);
