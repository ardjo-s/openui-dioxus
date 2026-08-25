import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import { surfaceToJsonRenderSpec } from "../src/json-render-route.mjs";
import { encodeExpectedRsx } from "../src/direct-rsx-route.mjs";
import { writeGeneratedPlatformFixtures } from "../src/platform-runner.mjs";

const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("accepted generated outputs become isolated platform fixtures", async () => {
  const directory = await mkdtemp(path.join(temporaryRoot.pathname, "platform-fixtures-"));
  try {
    const scenarios = await buildScenarios();
    const profile = scenarios.find((scenario) => scenario.id === "01-validated-profile-v1");
    const preferences = scenarios.find((scenario) => scenario.id === "02-preferences-v1");
    const filter = scenarios.find((scenario) => scenario.id === "03-filter-action-v1");
    const status = scenarios.find((scenario) => scenario.id === "04-status-dialog-v1");
    const records = [
      accepted("openui", profile, { platform_artifact: profile.expected }),
      accepted("typed-json", preferences, { platform_artifact: preferences.expected }),
      accepted("json-render", preferences, { platform_artifact: surfaceToJsonRenderSpec(preferences.expected) }),
      accepted("direct-rsx", filter, { cohort: "compile-known", platform_artifact: encodeExpectedRsx(filter.expected) }),
      accepted("direct-rsx", status, { cohort: "compile-known", platform_artifact: encodeExpectedRsx(status.expected) }),
    ];

    const result = await writeGeneratedPlatformFixtures(records, directory, "manifest-test-hash");
    const dioxus = JSON.parse(await readFile(result.dioxus_fixture, "utf8"));
    const react = JSON.parse(await readFile(result.react_fixture, "utf8"));

    assert.deepEqual(dioxus.entries.map((entry) => entry.route), ["openui", "typed-json"]);
    assert.deepEqual(dioxus.entries.map((entry) => entry.scenario_id), [profile.id, preferences.id]);
    assert.equal(dioxus.provenance.manifest_hash, "manifest-test-hash");
    assert.match(dioxus.provenance.binding_sha256, /^[a-f0-9]{64}$/);
    assert.equal(react.scenario_id, preferences.id);
    assert.equal(react.spec.root, preferences.expected.root);
    assert.equal(react.provenance.manifest_hash, "manifest-test-hash");
    assert.equal(result.direct_rsx_sources.length, 2);
    const directSource = await readFile(result.direct_rsx_crate_source, "utf8");
    assert.match(directSource, /route_0::App/);
    assert.match(directSource, /max-width: 860px/);
    assert.match(await readFile(path.join(result.direct_rsx_crate, "Cargo.toml"), "utf8"), /web-sys = .*"Location", "Window"/);
    assert.match(result.provenance.direct_rsx.binding_sha256, /^[a-f0-9]{64}$/);
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function accepted(route, scenario, extra) {
  return {
    route,
    cohort: "runtime-uncertain",
    scenario_id: scenario.id,
    source_scenario_id: scenario.id,
    family: scenario.family,
    accepted: true,
    attempt: 1,
    ...extra,
  };
}
