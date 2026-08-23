#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

import { buildA2UiPrompt, validateA2Ui } from "./a2ui.mjs";

const [command, inputPath] = process.argv.slice(2);

if (command === "prompt") {
  process.stdout.write(buildA2UiPrompt());
} else if (command === "validate" && inputPath) {
  const source = await readFile(inputPath, "utf8");
  process.stdout.write(`${JSON.stringify(validateA2Ui(source), null, 2)}\n`);
} else {
  process.stderr.write("usage: a2ui-cli.mjs prompt | validate <input>\n");
  process.exitCode = 2;
}
