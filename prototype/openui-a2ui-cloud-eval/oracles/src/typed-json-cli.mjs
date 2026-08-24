#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

import { buildTypedJsonPrompt, validateTypedJson } from "./typed-json.mjs";

const [command, inputPath] = process.argv.slice(2);

if (command === "prompt") {
  process.stdout.write(buildTypedJsonPrompt());
} else if (command === "validate" && inputPath) {
  const source = await readFile(inputPath, "utf8");
  process.stdout.write(`${JSON.stringify(validateTypedJson(source), null, 2)}\n`);
} else {
  process.stderr.write("usage: typed-json-cli.mjs prompt | validate <input>\n");
  process.exitCode = 2;
}
