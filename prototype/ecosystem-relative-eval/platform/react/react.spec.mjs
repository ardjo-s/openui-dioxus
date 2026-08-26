import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const evidence = path.resolve(process.env.OPE11_REACT_EVIDENCE_DIR ?? "evidence/react-web-local");

test("official json-render React seam executes state and action behavior", async ({ page }) => {
  await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  await page.goto("http://127.0.0.1:4183", { waitUntil: "networkidle" });
  const root = page.locator("#react-eval-root");
  await expect(root).toHaveAttribute("data-route", "json-render");
  await expect(root).toHaveAttribute("data-official-seam", "official-react-web");
  const manifestHash = await root.getAttribute("data-manifest-hash");
  const bindingSha256 = await root.getAttribute("data-binding-sha256");
  expect(manifestHash).toMatch(/^[a-zA-Z0-9_-]{16,64}$/);
  expect(bindingSha256).toMatch(/^[a-f0-9]{64}$/);

  const checkbox = page.getByRole("checkbox", { name: /Accept terms/ });
  await focusByKeyboard(page, checkbox);
  await expect(checkbox).toBeFocused();
  expect(await hasVisibleFocus(checkbox)).toBe(true);
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  const action = page.locator('[data-component="Button"]');
  await expect(action).toHaveCount(1);
  await focusByKeyboard(page, action);
  expect(await hasVisibleFocus(action)).toBe(true);
  await page.keyboard.press("Enter");

  await expect(root).toHaveAttribute("data-probe-complete", "true");
  await expect(root).toHaveAttribute("data-action-count", "1");
  const receipt = page.locator('[role="status"][data-receipt]');
  await expect(receipt).toHaveCount(1);
  await expect(receipt).toHaveAttribute("data-receipt", "receipt:ApplyFilter:preferences");
  await expect(receipt).toHaveAttribute("aria-live", "polite");
  const accessibility = await new AxeBuilder({ page }).analyze();
  const blocking = accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);

  const screenshot = path.join(evidence, "screenshots", "json-render-react-web.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await writeFile(path.join(evidence, "react-web.json"), `${JSON.stringify({
    platform: "web",
    route: "json-render",
    official_runtime: "@json-render/react@0.19.0",
    manifest_hash: manifestHash,
    binding_sha256: bindingSha256,
    passed: true,
    state_changed: true,
    action_receipt: "receipt:ApplyFilter:preferences",
    accessibility_contract_version: "ope-13-observable-accessibility-v1",
    keyboard_operable: true,
    focus_visible: true,
    feedback_announced: true,
    accessibility_blocking_findings: 0,
    screenshot: path.basename(screenshot),
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
