#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const outputPath = args[args.indexOf("-o") + 1];
const prompt = readFileSync(0, "utf8");
const fixture = prompt.includes("OpenUI Lang") ? "reference.openui" : "reference.a2ui.json";
const fixturePath = fileURLToPath(new URL(`../../../fixtures/${fixture}`, import.meta.url));
const scenarioManifestPath = fileURLToPath(
  new URL("../../../fixtures/controlled-scenarios.json", import.meta.url),
);
const scenarioId = prompt.match(/CONTROLLED SCENARIO — ([^\n]+)/)?.[1];
const rows = scenarioId ? findScenarioRows(scenarioId) : null;
const output = process.env.FAKE_CODEX_OUTPUT_BYTES
  ? "x".repeat(Number(process.env.FAKE_CODEX_OUTPUT_BYTES))
  : rows
    ? controlledFixture(fixture, fixturePath, rows)
    : readFileSync(fixturePath, "utf8");
writeFileSync(outputPath, output);
console.log(JSON.stringify({ type: "thread.started", thread_id: `fake-${fixture}` }));
console.log(
  JSON.stringify({
    type: "item.completed",
    item: { type: "agent_message", text: output },
  }),
);

function findScenarioRows(id) {
  const manifest = JSON.parse(readFileSync(scenarioManifestPath, "utf8"));
  for (const family of manifest.families) {
    for (const variant of family.variants) {
      if (`${family.id}-${variant.id}` === id) return variant.rows;
    }
  }
  throw new Error(`unknown controlled scenario: ${id}`);
}

function controlledFixture(name, fixtureFile, rows) {
  if (name === "reference.a2ui.json") {
    const value = JSON.parse(readFileSync(fixtureFile, "utf8"));
    const table = value.messages[1].updateComponents.components.find(
      (component) => component.component === "Table",
    );
    table.rows = rows;
    return JSON.stringify(value);
  }
  const value = readFileSync(fixtureFile, "utf8");
  return value.replace(
    /expenses = Table\((.*?), \[(.*?)\], \[[^\n]+\]\)/,
    (_, prefix, columns) =>
      `expenses = Table(${prefix}, [${columns}], ${JSON.stringify(rows)})`,
  );
}
console.log(
  JSON.stringify({
    type: "turn.completed",
    usage: {
      input_tokens: 1000,
      cached_input_tokens: 100,
      cache_write_input_tokens: 0,
      output_tokens: 200,
      reasoning_output_tokens: 0,
    },
  }),
);
