import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { runBoundedProcess } from "../src/subprocess.mjs";

const temporaryRoot = new URL("../.tmp/", import.meta.url);

test("bounded subprocess kills and reaps the full descendant process group", async () => {
  const directory = await mkdtemp(path.join(temporaryRoot.pathname, "subprocess-"));
  const marker = path.join(directory, "descendant-survived");
  try {
    const result = await runBoundedProcess({
      command: "/bin/zsh",
      args: ["-lc", `trap '' TERM; (trap '' TERM; sleep 2; touch ${JSON.stringify(marker)}) & wait`],
      cwd: directory,
      env: { PATH: process.env.PATH },
      timeoutMs: 50,
      maximumBytes: 1024,
      terminationGraceMs: 50,
    });

    assert.match(result.error, /exceeded 50 ms/);
    assert.equal(result.process_started, true);
    assert.equal(result.process_group_reaped, true);
    await new Promise((resolve) => setTimeout(resolve, 2_100));
    await assert.rejects(access(marker));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bounded subprocess distinguishes a missing executable from a started process", async () => {
  const result = await runBoundedProcess({
    command: "/definitely/missing/openui-dioxus-provider",
    args: [],
    cwd: new URL("..", import.meta.url),
    env: { PATH: process.env.PATH },
    timeoutMs: 1_000,
    maximumBytes: 1_024,
  });

  assert.equal(result.process_started, false);
  assert.match(result.error, /ENOENT/u);
});
