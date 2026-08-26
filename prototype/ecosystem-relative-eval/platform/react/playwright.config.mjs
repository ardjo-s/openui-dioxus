import path from "node:path";

import { defineConfig } from "@playwright/test";

const evidence = path.resolve(process.env.OPE11_REACT_EVIDENCE_DIR ?? "evidence/react-web-local");

export default defineConfig({
  testDir: ".",
  testMatch: "react.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: path.join(evidence, "traces"),
  webServer: {
    command: "node build.mjs && python3 -m http.server 4183 --bind 127.0.0.1 --directory dist",
    url: "http://127.0.0.1:4183",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    browserName: "chromium",
    headless: true,
    trace: "on",
    viewport: { width: 1280, height: 900 },
  },
});
