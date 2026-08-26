import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCodexArgs,
  buildProviderEnvironment,
  parseCodexEvents,
} from "../src/codex-provider.mjs";

test("Codex provider freezes Luna low and disables every tool surface", () => {
  const args = buildCodexArgs({ outputPath: "/tmp/output", model: "gpt-5.6-luna", reasoningEffort: "low" });

  assert.ok(args.includes("gpt-5.6-luna"));
  assert.ok(args.includes('model_reasoning_effort="low"'));
  assert.ok(args.includes("--ephemeral"));
  assert.ok(args.includes("--ignore-user-config"));
  assert.ok(args.includes("--ignore-rules"));
  assert.equal(args.at(-1), "-");
});

test("provider subprocess receives only an explicit non-secret environment", () => {
  const environment = buildProviderEnvironment({
    codexHome: "/isolated/codex",
    cwd: "/isolated/work",
    source: {
      PATH: "/usr/bin",
      LANG: "en_US.UTF-8",
      LC_ALL: "en_US.UTF-8",
      TMPDIR: "/ambient/tmp",
      SECRET_TOKEN: "must-not-pass",
      AWS_ACCESS_KEY_ID: "must-not-pass",
      OPENAI_API_KEY: "must-not-pass",
    },
  });

  assert.deepEqual(environment, {
    CODEX_HOME: "/isolated/codex",
    HOME: "/isolated/work",
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
    NO_COLOR: "1",
    PATH: "/usr/bin",
    TERM: "dumb",
    TMPDIR: "/isolated/work/tmp",
  });
});

test("completed Codex events expose billed, cached, and reasoning tokens", () => {
  const parsed = parseCodexEvents([
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message" } }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 10, cached_input_tokens: 3, output_tokens: 4, reasoning_output_tokens: 2 } }),
  ].join("\n"));

  assert.equal(parsed.threadId, "thread-1");
  assert.equal(parsed.usage.total_tokens, 14);
  assert.equal(parsed.usage.reasoning_tokens, 2);
  assert.deepEqual(parsed.toolActivity, []);
});
