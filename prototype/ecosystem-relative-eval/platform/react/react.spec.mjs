import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { buildScenarios } from "../../../openui-typed-json-product-eval/src/scenarios.mjs";
import { accessibilityContractForSurface, validateRenderedAccessibility } from "../../src/accessibility-contract.mjs";

const evidence = path.resolve(process.env.OPE11_REACT_EVIDENCE_DIR ?? "evidence/react-web-local");

test("official json-render React seam executes state and action behavior", async ({ page }) => {
  await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  await page.goto("http://127.0.0.1:4183", { waitUntil: "networkidle" });
  const root = page.locator("#react-eval-root");
  await expect(root).toHaveAttribute("data-route", "json-render");
  await expect(root).toHaveAttribute("data-official-seam", "official-react-web");
  const surfaceCount = Number(await root.getAttribute("data-surface-count"));
  const completeScope = await root.getAttribute("data-complete-scope") === "true";
  expect(surfaceCount).toBeGreaterThanOrEqual(1);
  const manifestHash = await root.getAttribute("data-manifest-hash");
  const bindingSha256 = await root.getAttribute("data-binding-sha256");
  expect(manifestHash).toMatch(/^[a-zA-Z0-9_-]{16,64}$/);
  expect(bindingSha256).toMatch(/^[a-f0-9]{64}$/);

  const scenarios = await buildScenarios();
  const scenarioIds = [];
  const actionReceipts = [];
  const screenshots = [];
  const artifacts = [];
  for (let index = 0; index < surfaceCount; index += 1) {
    await expect(root).toHaveAttribute("data-current-index", String(index));
    if (completeScope) {
      const stateProbe = root.locator('[data-probe-step="state"]');
      await focusByKeyboard(page, stateProbe);
      expect(await hasVisibleFocus(stateProbe)).toBe(true);
      await page.keyboard.press("Enter");
    } else {
      const checkbox = page.getByRole("checkbox", { name: /Accept terms/ });
      await focusByKeyboard(page, checkbox);
      await expect(checkbox).toBeFocused();
      expect(await hasVisibleFocus(checkbox)).toBe(true);
      await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
    }
    const action = root.locator('[data-component="Button"]');
    await expect(action).toHaveCount(1);
    await focusByKeyboard(page, action);
    expect(await hasVisibleFocus(action)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(root).toHaveAttribute("data-probe-complete", "true");
    await expect(root).toHaveAttribute("data-action-count", "1");
    const receipt = root.locator('[role="status"][data-receipt]');
    await expect(receipt).toHaveCount(1);
    const actionReceipt = await receipt.getAttribute("data-receipt");
    expect(actionReceipt).toMatch(/^receipt:(?:SubmitProfile|ApplyFilter):.+/);
    actionReceipts.push(actionReceipt);
    await expect(receipt).toHaveAttribute("aria-live", "polite");
    await expect(receipt).not.toHaveAttribute("data-component", /.+/);
    const scenarioId = await root.getAttribute("data-scenario-id");
    const scheduleScenarioId = await root.getAttribute("data-schedule-scenario-id");
    const cohort = await root.getAttribute("data-cohort");
    scenarioIds.push(scenarioId);
    const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
    const semanticPatterns = validateRenderedAccessibility(await page.content(), accessibilityContractForSurface(scenario.expected));
    expect(semanticPatterns.passed, JSON.stringify(semanticPatterns.diagnostics, null, 2)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    const screenshot = `json-render-react-web-${index + 1}.png`;
    await page.screenshot({ path: path.join(evidence, "screenshots", screenshot), fullPage: true });
    screenshots.push(screenshot);
    artifacts.push({ route: "json-render", cohort, schedule_scenario_id: scheduleScenarioId, scenario_id: scenarioId, screenshot });
    if (index + 1 < surfaceCount) await root.getByRole("button", { name: "Next Surface" }).click();
  }
  await writeFile(path.join(evidence, "react-web.json"), `${JSON.stringify({
    platform: "web",
    route: "json-render",
    official_runtime: "@json-render/react@0.19.0",
    manifest_hash: manifestHash,
    binding_sha256: bindingSha256,
    surface_count: surfaceCount,
    scenarios: scenarioIds,
    passed: true,
    state_changed: true,
    action_receipt: actionReceipts[0],
    action_receipts: actionReceipts,
    accessibility_contract_version: "ope-15-route-neutral-patterns-v1",
    keyboard_operable: true,
    focus_visible: true,
    feedback_announced: true,
    host_receipt_outside_component_coverage: true,
    semantic_patterns_verified: true,
    accessibility_blocking_findings: 0,
    screenshot: screenshots[0],
    screenshots,
    artifacts,
  }, null, 2)}\n`);
});

async function focusByKeyboard(page, target) {
  for (let attempt = 0; attempt < 32; attempt += 1) {
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
