import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { buildScenarios } from "../../../openui-typed-json-product-eval/src/scenarios.mjs";
import { accessibilityContractForSurface, validateRenderedAccessibility } from "../../src/accessibility-contract.mjs";

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
  const contracts = await buildScenarios();
  let stateChanges = 0;
  for (let index = 0; index < 2; index += 1) {
    await expect(root).toHaveAttribute("data-current-index", String(index));
    const section = root.locator("section[data-scenario-id]");
    const scenarioId = await section.getAttribute("data-scenario-id");
    scenarios.push(scenarioId);
    const app = section.locator('[data-route="direct-rsx"]');
    const select = app.locator("select");
    if (await select.count()) {
      await focusByKeyboard(page, select);
      expect(await hasVisibleFocus(select)).toBe(true);
      await page.keyboard.press("m");
      await expect(select).not.toHaveValue("All");
      stateChanges += 1;
    }
    const action = app.locator("button[data-action]");
    await expect(action).toBeVisible();
    await focusByKeyboard(page, action);
    expect(await hasVisibleFocus(action)).toBe(true);
    await page.keyboard.press("Enter");
    const receipt = app.locator('[role="status"][data-receipt]');
    await expect(receipt).toHaveCount(1);
    await expect(receipt).toHaveAttribute("data-action-count", "1");
    const expectedReceipt = `receipt:${await action.getAttribute("data-action")}:${await action.getAttribute("data-target-id")}`;
    await expect(receipt).toHaveAttribute("data-receipt", expectedReceipt);
    await expect(receipt).toContainText(expectedReceipt);
    await expect(receipt).toHaveAttribute("aria-live", "polite");
    await expect(receipt).not.toHaveAttribute("data-component", /.+/);
    const scenario = contracts.find((candidate) => candidate.id === scenarioId);
    const semanticPatterns = validateRenderedAccessibility(await page.content(), accessibilityContractForSurface(scenario.expected));
    expect(semanticPatterns.passed, JSON.stringify(semanticPatterns.diagnostics, null, 2)).toBe(true);
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
    accessibility_contract_version: "ope-15-route-neutral-patterns-v1",
    keyboard_operable: true,
    focus_visible: true,
    feedback_announced: true,
    host_receipt_outside_component_coverage: true,
    semantic_patterns_verified: true,
    accessibility_blocking_findings: 0,
    screenshots: ["direct-rsx-web-1.png", "direct-rsx-web-2.png"],
  }, null, 2)}\n`);
});

async function focusByKeyboard(page, target) {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("target was not reachable by keyboard");
}

async function hasVisibleFocus(target) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
  });
}
