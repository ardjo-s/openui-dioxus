#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const outputPath = args[args.indexOf("-o") + 1];
const prompt = readFileSync(0, "utf8");
const fixture = prompt.includes("OpenUI Lang") ? "reference.openui" : "reference.a2ui.json";
const fixturePath = fileURLToPath(new URL(`../../../fixtures/${fixture}`, import.meta.url));
const output = process.env.FAKE_CODEX_OUTPUT_BYTES
  ? "x".repeat(Number(process.env.FAKE_CODEX_OUTPUT_BYTES))
  : readFileSync(fixturePath, "utf8");
writeFileSync(outputPath, output);
console.log(JSON.stringify({ type: "thread.started", thread_id: `fake-${fixture}` }));
console.log(
  JSON.stringify({
    type: "item.completed",
    item: { type: "agent_message", text: output },
  }),
);
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
