import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCodexArgs, generateWithCodex, parseCodexEvents } from "../src/codex-provider.mjs";

test("Codex arguments pin an isolated Luna-low session and accept the prompt only on stdin", () => {
  const args = buildCodexArgs({ outputPath: "/tmp/result.txt" });
  assert.deepEqual(args.slice(0, 8), [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "-m",
    "gpt-5.6-luna",
    "-c",
    'model_reasoning_effort="low"',
  ]);
  assert.ok(args.includes("read-only"));
  assert.ok(args.includes("--json"));
  assert.ok(args.includes("shell_tool"));
  assert.equal(args.at(-1), "-");
});

test("Codex event parsing preserves plan usage and reports tool activity", () => {
  const parsed = parseCodexEvents(
    [
      JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
      JSON.stringify({
        type: "item.completed",
        item: { id: "item-1", type: "command_execution", command: "pwd" },
      }),
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 120,
          cached_input_tokens: 20,
          cache_write_input_tokens: 0,
          output_tokens: 30,
          reasoning_output_tokens: 4,
        },
      }),
    ].join("\n"),
  );
  assert.equal(parsed.threadId, "thread-1");
  assert.equal(parsed.usage.total_tokens, 150);
  assert.equal(parsed.usage.reasoning_tokens, 4);
  assert.deepEqual(parsed.toolActivity, ["command_execution"]);
});

test("the provider uses a fake Codex executable without leaking the prompt into argv", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openui-codex-provider-"));
  try {
    const executable = path.join(directory, "fake-codex.mjs");
    const outputPath = path.join(directory, "output.txt");
    const argvPath = path.join(directory, "argv.json");
    const promptPath = path.join(directory, "prompt.txt");
    const homePath = path.join(directory, "home.txt");
    await writeFile(
      executable,
      `#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const output = args[args.indexOf("-o") + 1];
writeFileSync(${JSON.stringify(argvPath)}, JSON.stringify(args));
writeFileSync(${JSON.stringify(promptPath)}, readFileSync(0, "utf8"));
writeFileSync(${JSON.stringify(homePath)}, process.env.CODEX_HOME ?? "");
writeFileSync(output, "root = Text(\\\"root\\\", \\\"hello\\\")");
console.log(JSON.stringify({ type: "thread.started", thread_id: "fake-thread" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "payload" } }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 100, cached_input_tokens: 25, cache_write_input_tokens: 0, output_tokens: 10, reasoning_output_tokens: 2 } }));
`,
    );
    await chmod(executable, 0o755);

    const result = generateWithCodex({
      command: executable,
      prompt: "PRIVATE PROMPT",
      outputPath,
      codexHome: directory,
      cwd: directory,
      maxResponseBytes: 256 * 1024,
    });

    assert.equal(result.output, 'root = Text("root", "hello")');
    assert.equal(result.usage.input_tokens, 100);
    assert.deepEqual(result.toolActivity, []);
    assert.equal(await readFile(promptPath, "utf8"), "PRIVATE PROMPT");
    assert.equal(await readFile(homePath, "utf8"), directory);
    assert.ok(!(await readFile(argvPath, "utf8")).includes("PRIVATE PROMPT"));
    assert.equal(result.outputTooLarge, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the provider marks oversized output before protocol validation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openui-codex-provider-size-"));
  try {
    const executable = path.join(directory, "fake-codex.mjs");
    const outputPath = path.join(directory, "output.txt");
    await writeFile(
      executable,
      `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const args = process.argv.slice(2);
writeFileSync(args[args.indexOf("-o") + 1], "12345");
console.log(JSON.stringify({ type: "thread.started", thread_id: "fake-thread" }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 } }));
`,
    );
    await chmod(executable, 0o755);
    const result = generateWithCodex({
      command: executable,
      prompt: "prompt",
      outputPath,
      codexHome: directory,
      cwd: directory,
      maxResponseBytes: 4,
    });
    assert.equal(result.outputTooLarge, true);
    assert.equal(result.output, "1234");
    assert.equal((await stat(outputPath)).size, 5);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("tool activity aborts the provider and retains event evidence", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openui-codex-provider-tool-"));
  try {
    const executable = path.join(directory, "fake-codex.mjs");
    const outputPath = path.join(directory, "output.txt");
    await writeFile(
      executable,
      `#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const args = process.argv.slice(2);
writeFileSync(args[args.indexOf("-o") + 1], "payload");
console.log(JSON.stringify({ type: "thread.started", thread_id: "fake-thread" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "pwd" } }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }));
`,
    );
    await chmod(executable, 0o755);
    assert.throws(
      () =>
        generateWithCodex({
          command: executable,
          prompt: "prompt",
          outputPath,
          codexHome: directory,
          cwd: directory,
          maxResponseBytes: 256 * 1024,
        }),
      (error) => {
        assert.deepEqual(error.toolActivity, ["command_execution"]);
        assert.match(error.eventsRaw, /command_execution/);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a failed Codex process exposes stdout and stderr for diagnostics", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openui-codex-provider-fail-"));
  try {
    const executable = path.join(directory, "fake-codex.mjs");
    await writeFile(
      executable,
      `#!/usr/bin/env node
console.log(JSON.stringify({ type: "thread.started", thread_id: "failed-thread" }));
console.error("provider diagnostic");
process.exit(3);
`,
    );
    await chmod(executable, 0o755);
    assert.throws(
      () =>
        generateWithCodex({
          command: executable,
          prompt: "prompt",
          outputPath: path.join(directory, "output.txt"),
          codexHome: directory,
          cwd: directory,
          maxResponseBytes: 256 * 1024,
        }),
      (error) => {
        assert.match(error.eventsRaw, /failed-thread/);
        assert.match(error.stderr, /provider diagnostic/);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
