import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { buildScenarios } from "../../../openui-typed-json-product-eval/src/scenarios.mjs";
import { accessibilityContractForSurface, validateRenderedAccessibility } from "../../src/accessibility-contract.mjs";

const evidence = path.resolve(process.env.OPE11_DIOXUS_WEB_EVIDENCE_DIR ?? "evidence/dioxus-web-local");

test("OpenUI and typed JSON execute through the same Dioxus Web runtime", async ({ page }) => {
  await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  await page.goto("http://127.0.0.1:4184", { waitUntil: "networkidle" });
  const root = page.locator("#ope11-dioxus-root");
  const surfaceCount = Number(await root.getAttribute("data-surface-count"));
  expect(surfaceCount).toBeGreaterThanOrEqual(2);
  const manifestHash = await page.locator("#ope11-manifest-hash").textContent();
  const bindingSha256 = await page.locator("#ope11-binding-sha256").textContent();
  expect(manifestHash).toMatch(/^[a-zA-Z0-9_-]{16,64}$/);
  expect(bindingSha256).toMatch(/^[a-f0-9]{64}$/);
  const routes = [];
  const artifacts = [];
  const scenarios = await buildScenarios();
  const screenshots = [];
  for (let index = 0; index < surfaceCount; index += 1) {
    await expect(root).toHaveAttribute("data-current-index", String(index));
    const panel = root.locator("article.surface");
    const route = await panel.getAttribute("data-route");
    const scenarioId = await panel.getAttribute("data-scenario-id");
    const scheduleScenarioId = await panel.getAttribute("data-schedule-scenario-id");
    const cohort = await panel.getAttribute("data-cohort");
    routes.push(route);
    await expect(panel.locator("[data-component]").first()).toBeVisible();
    for (const step of ["state", "action", "update", "replay"]) {
      const control = panel.locator(`[data-probe-step="${step}"]`);
      await focusByKeyboard(page, control);
      expect(await hasVisibleFocus(control)).toBe(true);
      await page.keyboard.press("Enter");
    }
    const status = panel.getByRole("status");
    await expect(status).toHaveAttribute("data-probe-complete", "true");
    await expect(status).toHaveAttribute("data-action-exactly-once", "true");
    await expect(status).toHaveAttribute("data-replay-effects", "0");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).not.toHaveAttribute("data-component", /.+/);
    const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
    const semanticPatterns = validateRenderedAccessibility(await page.content(), accessibilityContractForSurface(scenario.expected));
    expect(semanticPatterns.passed, JSON.stringify(semanticPatterns.diagnostics, null, 2)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    const screenshot = `dioxus-web-${index + 1}.png`;
    await page.screenshot({ path: path.join(evidence, "screenshots", screenshot), fullPage: true });
    screenshots.push(screenshot);
    artifacts.push({ route, cohort, schedule_scenario_id: scheduleScenarioId, scenario_id: scenarioId, screenshot });
    if (index + 1 < surfaceCount) await page.getByRole("button", { name: "Next Surface" }).click();
  }
  const routeSet = [...new Set(routes)].sort();
  expect(routeSet).toEqual(["openui", "typed-json"]);
  await writeFile(path.join(evidence, "dioxus-web.json"), `${JSON.stringify({
    platform: "web",
    routes: routeSet,
    surface_count: surfaceCount,
    manifest_hash: manifestHash,
    binding_sha256: bindingSha256,
    passed: true,
    state_action_update_replay: true,
    accessibility_contract_version: "ope-15-route-neutral-patterns-v1",
    keyboard_operable: true,
    focus_visible: true,
    feedback_announced: true,
    host_receipt_outside_component_coverage: true,
    semantic_patterns_verified: true,
    accessibility_blocking_findings: 0,
    screenshots,
    artifacts,
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
