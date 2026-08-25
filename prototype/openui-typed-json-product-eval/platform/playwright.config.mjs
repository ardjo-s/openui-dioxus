import path from "node:path";

import { defineConfig } from "@playwright/test";

const evidence = path.resolve(process.env.OPE6_EVIDENCE_DIR ?? "evidence/platform-local");

export default defineConfig({
  testDir: ".",
  testMatch: "web.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: path.join(evidence, "traces", "playwright"),
  use: {
    browserName: "chromium",
    headless: true,
    trace: "on",
    viewport: { width: 1280, height: 900 },
  },
});
