import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const evidence = path.resolve(process.env.OPE11_DIRECT_RSX_EVIDENCE_DIR ?? "evidence/direct-rsx-web-local");

test("accepted direct RSX executes state, typed action receipt, and visible feedback", async ({ page }) => {
  await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  const externalRequests = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost"].includes(url.hostname)) await route.continue();
    else {
      externalRequests.push(url.origin);
      await route.abort("blockedbyclient");
    }
  });
  await page.goto("http://127.0.0.1:4185", { waitUntil: "networkidle" });
  const root = page.locator("#ope11-direct-rsx-root");
  await expect(root).toHaveAttribute("data-surface-count", "2");
  const manifestHash = await root.getAttribute("data-manifest-hash");
  const bindingSha256 = await root.getAttribute("data-binding-sha256");
  expect(manifestHash).toMatch(/^[a-f0-9]{64}$/);
  expect(bindingSha256).toMatch(/^[a-f0-9]{64}$/);
  const scenarios = [];
  let stateChanges = 0;
  for (let index = 0; index < 2; index += 1) {
    await expect(root).toHaveAttribute("data-current-index", String(index));
    const section = root.locator("section[data-scenario-id]");
    scenarios.push(await section.getAttribute("data-scenario-id"));
    const app = section.locator('[data-route="direct-rsx"]');
    const select = app.locator("select");
    if (await select.count()) {
      await select.selectOption({ index: 1 });
      await expect(select).not.toHaveValue("All");
      stateChanges += 1;
    }
    const action = app.locator("button[data-action]");
    await expect(action).toBeVisible();
    await action.click();
    const receipt = app.locator('[role="status"][data-receipt]');
    await expect(receipt).toHaveCount(1);
    await expect(receipt).toHaveAttribute("data-action-count", "1");
    await expect(receipt).toHaveAttribute("data-receipt", /^receipt:[A-Za-z]+:[a-z]+$/);
    await expect(receipt).toContainText("receipt:");
    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    await page.screenshot({ path: path.join(evidence, "screenshots", `direct-rsx-web-${index + 1}.png`), fullPage: true });
    if (index === 0) await page.getByRole("button", { name: "Next Source" }).click();
  }
  expect(stateChanges).toBeGreaterThanOrEqual(1);
  expect(externalRequests).toEqual([]);
  await writeFile(path.join(evidence, "direct-rsx-web.json"), `${JSON.stringify({
    platform: "web",
    route: "direct-rsx",
    scenarios,
    manifest_hash: manifestHash,
    binding_sha256: bindingSha256,
    passed: true,
    state_changed: true,
    action_receipts_exactly_once: true,
    visible_feedback: true,
    accessibility_blocking_findings: 0,
    screenshots: ["direct-rsx-web-1.png", "direct-rsx-web-2.png"],
  }, null, 2)}\n`);
});
