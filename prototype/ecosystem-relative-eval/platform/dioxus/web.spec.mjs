import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const evidence = path.resolve(process.env.OPE11_DIOXUS_WEB_EVIDENCE_DIR ?? "evidence/dioxus-web-local");

test("OpenUI and typed JSON execute through the same Dioxus Web runtime", async ({ page }) => {
  await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  await page.goto("http://127.0.0.1:4184", { waitUntil: "networkidle" });
  const root = page.locator("#ope11-dioxus-root");
  await expect(root).toHaveAttribute("data-surface-count", "2");
  const manifestHash = await page.locator("#ope11-manifest-hash").textContent();
  const bindingSha256 = await page.locator("#ope11-binding-sha256").textContent();
  expect(manifestHash).toMatch(/^[a-zA-Z0-9_-]{16,64}$/);
  expect(bindingSha256).toMatch(/^[a-f0-9]{64}$/);
  const routes = [];
  for (let index = 0; index < 2; index += 1) {
    await expect(root).toHaveAttribute("data-current-index", String(index));
    const panel = root.locator("article.surface");
    const route = await panel.getAttribute("data-route");
    routes.push(route);
    await expect(panel.locator("[data-component]").first()).toBeVisible();
    for (const step of ["state", "action", "update", "replay"]) {
      await panel.locator(`[data-probe-step="${step}"]`).click();
    }
    const status = panel.getByRole("status");
    await expect(status).toHaveAttribute("data-probe-complete", "true");
    await expect(status).toHaveAttribute("data-action-exactly-once", "true");
    await expect(status).toHaveAttribute("data-replay-effects", "0");
    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    await page.screenshot({ path: path.join(evidence, "screenshots", `dioxus-web-${index + 1}.png`), fullPage: true });
    if (index === 0) await page.getByRole("button", { name: "Next Surface" }).click();
  }
  expect(routes).toEqual(["openui", "typed-json"]);
  await writeFile(path.join(evidence, "dioxus-web.json"), `${JSON.stringify({
    platform: "web",
    routes,
    manifest_hash: manifestHash,
    binding_sha256: bindingSha256,
    passed: true,
    state_action_update_replay: true,
    accessibility_blocking_findings: 0,
    screenshots: ["dioxus-web-1.png", "dioxus-web-2.png"],
  }, null, 2)}\n`);
});
