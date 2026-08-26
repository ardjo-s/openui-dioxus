import path from "node:path";

import { defineConfig } from "@playwright/test";

const evidence = path.resolve(process.env.OPE11_DIOXUS_WEB_EVIDENCE_DIR ?? "evidence/dioxus-web-local");

export default defineConfig({
  testDir: ".",
  testMatch: "web.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: path.join(evidence, "traces"),
  webServer: {
    command: "../../.tmp/dioxus-cli/bin/dx build --web --release --features web --bin ope11-dioxus-canary --debug-symbols false && python3 -m http.server 4184 --bind 127.0.0.1 --directory target/dx/ope11-dioxus-canary/release/web/public",
    url: "http://127.0.0.1:4184",
    reuseExistingServer: false,
    timeout: 240_000,
  },
  use: {
    browserName: "chromium",
    headless: true,
    trace: "on",
    viewport: { width: 1280, height: 900 },
  },
});
