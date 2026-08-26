import assert from "node:assert/strict";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import {
  encodeExpectedJsonRender,
  jsonRenderCatalog,
  jsonRenderPrompt,
  validateJsonRender,
} from "../src/json-render-route.mjs";

test("official json-render catalog accepts an equivalent native spec", async () => {
  const [scenario] = await buildScenarios();
  const source = encodeExpectedJsonRender(scenario.expected);
  const result = validateJsonRender(source, scenario.expected);

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.observable_match, true);
  assert.equal(result.spec.root, scenario.expected.root);
  assert.equal(jsonRenderCatalog.validate(result.spec).success, true);
  assert.match(jsonRenderPrompt(), /AVAILABLE COMPONENTS/);
});

test("json-render validation rejects text that its stream compiler would ignore", async () => {
  const [scenario] = await buildScenarios();
  const source = `explanation\n${encodeExpectedJsonRender(scenario.expected)}`;
  const result = validateJsonRender(source, scenario.expected);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "invalid-stream-line"));
});

test("json-render validation rejects unknown actions before rendering", async () => {
  const [scenario] = await buildScenarios();
  const source = encodeExpectedJsonRender(scenario.expected).replace("SubmitProfile", "DeleteEverything");
  const result = validateJsonRender(source, scenario.expected);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "official-catalog" || item.code === "action-policy"));
});
