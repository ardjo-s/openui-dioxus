#!/usr/bin/env node
import path from "node:path";

import { DEFAULT_MINIMUM_FREE_BYTES, minimumFreeBytesFromEnvironment, recordStorageGate } from "../src/storage-gate.mjs";

const options = parse(process.argv.slice(2));
const result = await recordStorageGate({
  evidenceDirectory: options.evidenceDirectory,
  targetDirectory: options.targetDirectory,
  stage: options.stage,
  minimumFreeBytes: options.minimumFreeBytes,
  recordPath: options.recordPath,
  failurePath: options.failurePath,
});
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.passed) process.exitCode = 3;

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${name}`);
    if (name === "--evidence") values.evidenceDirectory = path.resolve(value);
    else if (name === "--target") values.targetDirectory = path.resolve(value);
    else if (name === "--stage") values.stage = value;
    else if (name === "--record") values.recordPath = path.resolve(value);
    else if (name === "--failure") values.failurePath = path.resolve(value);
    else if (name === "--minimum") values.minimumFreeBytes = Number(value);
    else throw new Error(`unknown argument: ${name}`);
  }
  for (const required of ["evidenceDirectory", "targetDirectory", "stage", "recordPath", "failurePath"]) {
    if (!values[required]) throw new Error(`missing required storage-gate argument: ${required}`);
  }
  values.minimumFreeBytes ??= minimumFreeBytesFromEnvironment();
  if (!Number.isSafeInteger(values.minimumFreeBytes) || values.minimumFreeBytes <= 0) {
    throw new Error(`invalid minimum free bytes: ${values.minimumFreeBytes}`);
  }
  if (values.minimumFreeBytes < DEFAULT_MINIMUM_FREE_BYTES) {
    throw new Error(`minimum free bytes cannot be lower than the registered minimum: ${DEFAULT_MINIMUM_FREE_BYTES}`);
  }
  return values;
}
