import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCodexArgs,
  buildProviderEnvironment,
  inspectCodexEvents,
  parseCodexEvents,
  verifyProviderEventEvidence,
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

test("real provider invocation is not exported from reusable modules", async () => {
  const provider = await import("../src/provider.mjs");
  const codexProvider = await import("../src/codex-provider.mjs");
  assert.equal(Object.hasOwn(provider, "generateRouteOutput"), false);
  assert.equal(Object.hasOwn(codexProvider, "generateWithCodex"), false);
});

test("partial Codex events distinguish a started provider thread from a completed turn", () => {
  assert.deepEqual(inspectCodexEvents(""), {
    thread_started: false,
    turn_completed: false,
    thread_start_count: 0,
    turn_completed_count: 0,
    ordered: true,
  });
  assert.deepEqual(inspectCodexEvents(JSON.stringify({ type: "thread.started", thread_id: "thread-1" })), {
    thread_started: true,
    turn_completed: false,
    thread_start_count: 1,
    turn_completed_count: 0,
    ordered: true,
  });
  assert.deepEqual(inspectCodexEvents([
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 } }),
  ].join("\n")), {
    thread_started: true,
    turn_completed: true,
    thread_start_count: 1,
    turn_completed_count: 1,
    ordered: true,
  });
  assert.equal(inspectCodexEvents([
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 } }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message" } }),
  ].join("\n")).ordered, false);
});

test("provider event evidence requires one ordered stream per invocation", () => {
  const record = {
    evidence_stem: "01-scenario-openui-attempt-1",
    provider_invocation_attempted: true,
    provider_process_started: true,
    provider_thread_started: true,
    provider_completed: true,
  };
  const valid = [
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 10, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 2, reasoning_output_tokens: 1 } }),
  ].join("\n");
  assert.deepEqual(verifyProviderEventEvidence({
    records: [record],
    eventSources: new Map([[`${record.evidence_stem}.jsonl`, valid]]),
  }), { files: 1, thread_starts: 1, completed_turns: 1 });
  assert.throws(() => verifyProviderEventEvidence({
    records: [record],
    eventSources: new Map([[`${record.evidence_stem}.jsonl`, `${valid}\n${JSON.stringify({ type: "thread.started", thread_id: "thread-2" })}`]]),
  }), /exactly zero or one thread start and completion/u);
  assert.throws(() => verifyProviderEventEvidence({
    records: [record],
    eventSources: new Map([["unexpected.jsonl", valid]]),
  }), /event file inventory differs/u);
  assert.throws(() => verifyProviderEventEvidence({
    records: [{ ...record, provider_invocation_attempted: false }],
    eventSources: new Map(),
  }), /provider process start lacks an invocation attempt/u);
  assert.throws(() => verifyProviderEventEvidence({
    records: [record],
    eventSources: new Map([[`${record.evidence_stem}.jsonl`, `${valid}\n${JSON.stringify({ type: "item.completed" })}`]]),
  }), /out of order/u);
  assert.throws(() => verifyProviderEventEvidence({
    records: [record],
    eventSources: new Map([[`${record.evidence_stem}.jsonl`, [
      JSON.stringify({ type: "thread.started" }),
      JSON.stringify({ type: "turn.completed" }),
    ].join("\n")]]),
  }), /invalid thread.started event/u);
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
