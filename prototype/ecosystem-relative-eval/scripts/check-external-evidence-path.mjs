#!/usr/bin/env node

import path from "node:path";

import { assertExternalEvidenceDirectory } from "../src/v2-execution-guard.mjs";

const options = parse(process.argv.slice(2));
await assertExternalEvidenceDirectory({
  repoRoot: options.repo,
  outputDirectory: options.output,
});

function parse(argv) {
  const options = { repo: null, output: null };
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (name === "--repo") options.repo = path.resolve(value);
    else if (name === "--output") options.output = path.resolve(value);
    else throw new Error(`unknown argument: ${name}`);
  }
  if (!options.repo || !options.output) throw new Error("repo and output are required");
  return options;
}
