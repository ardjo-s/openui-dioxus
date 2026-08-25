import { mkdir } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const baseURL = process.env.OPE6_WEB_URL ?? "http://127.0.0.1:4173";
const evidence = path.resolve(process.env.OPE6_EVIDENCE_DIR ?? "evidence/platform-local");

test("all 40 Surfaces pass keyboard, accessibility, state, action, update, and replay", async ({ page }) => {
  await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  await page.goto(baseURL, { waitUntil: "networkidle" });
  const root = page.locator("#platform-root");
  await expect(root).toHaveAttribute("data-surface-count", "40");
  await expect(root).toHaveAttribute("data-family-count", "5");

  for (let index = 0; index < 40; index += 1) {
    await expect(root).toHaveAttribute("data-current-index", String(index));
    const shell = page.locator(".surface-shell");
    await expect(shell).toHaveCount(1);
    await expect(shell.locator("[data-component]").first()).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);

    const dialog = shell.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) {
      await focusInsideDialogWithKeyboard(page, dialog);
    } else {
      await focusProbeWithKeyboard(page);
    }
    const focusedOutline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(focusedOutline).not.toBe("none");

    for (const step of ["state", "action", "update", "replay"]) {
      await shell.locator(`[data-probe-step="${step}"]`).click({ force: await dialog.isVisible().catch(() => false) });
    }
    const status = shell.locator('[role="status"]');
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toHaveAttribute("data-probe-complete", "true");
    await expect(status).toHaveAttribute("data-action-exactly-once", "true");
    await expect(status).toHaveAttribute("data-replay-effects", "0");

    if (index === 0 || index === 39) {
      await page.screenshot({ path: path.join(evidence, "screenshots", `web-surface-${String(index + 1).padStart(2, "0")}.png`), fullPage: true });
    }
    if (index < 39) await page.getByRole("button", { name: "Next Surface" }).click();
  }
});

async function focusProbeWithKeyboard(page) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.keyboard.press("Tab");
    const found = await page.evaluate(() => document.activeElement?.hasAttribute("data-probe-step"));
    if (found) return;
  }
  throw new Error("keyboard traversal did not reach a runtime probe control");
}

async function focusInsideDialogWithKeyboard(page, dialog) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.keyboard.press("Tab");
    if (await dialog.evaluate((element) => element.contains(document.activeElement))) return;
  }
  throw new Error("keyboard traversal did not enter the modal dialog");
}
