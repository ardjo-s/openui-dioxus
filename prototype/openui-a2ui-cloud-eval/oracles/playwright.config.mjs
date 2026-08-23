import path from "node:path";

import { defineConfig } from "@playwright/test";

const results = path.resolve(process.env.EVAL_RESULTS_DIR ?? "../results");

export default defineConfig({
  testDir: "./test",
  testMatch: "web-runtime.spec.mjs",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  outputDir: path.join(results, "playwright"),
  use: {
    baseURL: process.env.EVAL_WEB_URL ?? "http://127.0.0.1:4173",
    trace: "on",
    screenshot: "only-on-failure",
  },
  reporter: [["line"], ["json", { outputFile: path.join(results, "playwright-report.json") }]],
});
