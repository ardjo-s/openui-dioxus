import assert from "node:assert/strict";
import test from "node:test";

import { fakeGenerate } from "../src/provider.mjs";
import { adapterLoc, encodeExpected, protocolPrompt, semanticCoverage, validateProtocol } from "../src/protocols.mjs";
import { buildScenarios } from "../src/scenarios.mjs";

test("official OpenUI and strict typed JSON normalize to identical wire Surfaces", async () => {
  for (const scenario of await buildScenarios()) {
    const openui = validateProtocol("openui", encodeExpected("openui", scenario.expected), scenario.expected.state);
    const typed = validateProtocol("typed-json", encodeExpected("typed-json", scenario.expected), scenario.expected.state);
    assert.equal(openui.ok, true, `${scenario.id}: ${JSON.stringify(openui.diagnostics)}`);
    assert.equal(typed.ok, true, `${scenario.id}: ${JSON.stringify(typed.diagnostics)}`);
    assert.deepEqual(openui.wire, scenario.expected);
    assert.deepEqual(typed.wire, scenario.expected);
    assert.equal(semanticCoverage(openui.wire, scenario.expected).passed, true);
    const alternateIds = structuredClone(typed.wire);
    const original = alternateIds.nodes[0].id;
    alternateIds.nodes[0].id = `${original}-alternate`;
    alternateIds.root = alternateIds.root === original ? `${original}-alternate` : alternateIds.root;
    assert.equal(semanticCoverage(alternateIds, scenario.expected).passed, true);
  }
});

test("protocol prompts bind the same catalog while charging both syntax contexts", () => {
  const openui = protocolPrompt("openui");
  const typed = protocolPrompt("typed-json");
  for (const name of ["Toolbar", "Input", "Select", "Dialog", "Toast"]) {
    assert.ok(openui.includes(name));
    assert.ok(typed.includes(name));
  }
  assert.ok(openui.includes("OPENUI SYNTAX AND CATALOG"));
  assert.ok(typed.includes("STRICT JSON SCHEMA"));
  assert.ok(adapterLoc().openui > adapterLoc()["typed-json"]);
});

test("fake-provider failures are repairable and symmetric", async () => {
  const scenarios = await buildScenarios();
  for (const [protocol, passage] of [["openui", 4], ["typed-json", 8]]) {
    const scenario = scenarios[passage - 1];
    const first = fakeGenerate({ protocol, passage, attempt: 1, scenario });
    const repair = fakeGenerate({ protocol, passage, attempt: 2, scenario });
    assert.equal(validateProtocol(protocol, first.output, scenario.expected.state).ok, false);
    assert.equal(validateProtocol(protocol, repair.output, scenario.expected.state).ok, true);
  }
});
