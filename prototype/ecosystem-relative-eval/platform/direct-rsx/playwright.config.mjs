import path from "node:path";

import { defineConfig } from "@playwright/test";

const crate = process.env.OPE11_DIRECT_RSX_CRATE;
const target = process.env.OPE11_DIRECT_RSX_TARGET_DIR;
if (!crate || !target) throw new Error("OPE11_DIRECT_RSX_CRATE and OPE11_DIRECT_RSX_TARGET_DIR are required");
const evidence = path.resolve(process.env.OPE11_DIRECT_RSX_EVIDENCE_DIR ?? "evidence/direct-rsx-web-local");
const dx = path.resolve(".tmp/dioxus-cli/bin/dx");

export default defineConfig({
  testDir: ".",
  testMatch: "web.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: path.join(evidence, "traces"),
  webServer: {
    cwd: crate,
    command: `"${dx}" build --web --release --features web --debug-symbols false && python3 -m http.server 4185 --bind 127.0.0.1 --directory "${target}/dx/ope11-direct-rsx-generated/release/web/public"`,
    env: { CARGO_TARGET_DIR: target },
    url: "http://127.0.0.1:4185",
    reuseExistingServer: false,
    timeout: 300_000,
  },
  use: {
    browserName: "chromium",
    headless: true,
    trace: "on",
    viewport: { width: 1280, height: 900 },
  },
});
