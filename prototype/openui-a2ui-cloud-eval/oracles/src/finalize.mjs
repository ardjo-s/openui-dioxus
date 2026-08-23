#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const [summaryPath, mobilePath, outputPath] = process.argv.slice(2);
const summary = JSON.parse(await readFile(summaryPath, "utf8"));
let mobile = { status: "SKIPPED" };
try {
  mobile = JSON.parse(await readFile(mobilePath, "utf8"));
} catch {}
const outcome =
  summary.pre_mobile_outcome !== "OPENUI_WIN_PENDING_MOBILE"
    ? summary.pre_mobile_outcome
    : mobile.status === "PASS"
      ? "OPENUI_WIN_MOBILE_PASS"
      : "OPENUI_WIN_MOBILE_FAIL";
const final = { ...summary, mobile_status: mobile.status, outcome, mobile };
await writeFile(outputPath, JSON.stringify(final, null, 2));
console.log(JSON.stringify({ outcome, mobile_status: mobile.status }));
