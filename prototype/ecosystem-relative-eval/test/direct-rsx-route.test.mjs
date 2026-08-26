import assert from "node:assert/strict";
import test from "node:test";

import { buildScenarios } from "../../openui-typed-json-product-eval/src/scenarios.mjs";
import {
  directRsxPrompt,
  encodeExpectedRsx,
  scanSource,
  validateDirectRsx,
} from "../src/direct-rsx-route.mjs";

test("direct RSX compiles and renders as ordinary Dioxus code", async () => {
  const scenarios = await buildScenarios();
  const scenario = scenarios.find((candidate) => candidate.family === "filter-action" && candidate.variant === 1);
  const source = encodeExpectedRsx(scenario.expected);
  const result = await validateDirectRsx(source, scenario.expected);

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.match(result.rendered_html, /data-route="direct-rsx"/);
  assert.match(result.rendered_html, /Apply/);
  assert.doesNotMatch(source, /SurfaceRevision|CatalogAdapter|json-render/);
  assert.match(source, /use_signal/);
  assert.match(source, /data-action-count/);
  assert.match(source, /data-receipt/);
  assert.match(source, /receipt:/);
  assert.match(directRsxPrompt(scenario), /ordinary Dioxus RSX/);
});

test("direct RSX rejects Dioxus escape hatches and remote resource elements", async () => {
  const [scenario] = await buildScenarios();
  const source = encodeExpectedRsx(scenario.expected);

  assert.ok(scanSource(`${source}\nfn escape() { dioxus::document::eval("fetch('https://example.com')"); }`).some((item) => item.code === "forbidden-source"));
  assert.ok(scanSource(source.replace("main {", "main { img { src: \"https://example.com/x\" },")).some((item) => item.code === "forbidden-source"));
  assert.ok(scanSource(`${source}\nfn escape() { let _ = web_sys::window(); }`).some((item) => item.code === "forbidden-source"));
  assert.ok(scanSource(`${source}\nfn escape() { let _ = ope11_dioxus_web_features::window(); }`).some((item) => item.code === "forbidden-source"));
  const metadataOnlyReceipt = source.replace(', "{receipt()}" } }', " } }");
  assert.notEqual(metadataOnlyReceipt, source);
  assert.match(metadataOnlyReceipt, /"data-receipt": "\{receipt\(\)\}"/);
  assert.ok(scanSource(metadataOnlyReceipt).some((item) => item.code === "source-contract"));
});

test("direct RSX rejects host-capable Rust before compilation", async () => {
  const [scenario] = await buildScenarios();
  const source = `${encodeExpectedRsx(scenario.expected)}\nfn leak() { std::fs::read_to_string("/tmp/x").unwrap(); }`;
  const result = await validateDirectRsx(source, scenario.expected);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "forbidden-source"));
  assert.equal(result.compiled, false);
});
