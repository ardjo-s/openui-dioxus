import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const results = path.resolve(process.env.EVAL_RESULTS_DIR ?? "results");
const surfaces = JSON.parse(await readFile(path.join(results, "surfaces.json"), "utf8"));

test("all accepted Surfaces preserve state, action, update and replay in Dioxus Web", async ({ page }) => {
  await page.goto("/");
  const list = page.locator("#surface-list");
  await expect(list).toHaveAttribute("data-surface-count", String(surfaces.length));
  const panels = page.locator("[data-surface-index]");
  await expect(panels).toHaveCount(surfaces.length);

  for (let index = 0; index < surfaces.length; index += 1) {
    const panel = panels.nth(index);
    const kinds = await panel.locator("[data-component]").evaluateAll((nodes) =>
      [...new Set(nodes.map((node) => node.getAttribute("data-component")))].sort(),
    );
    expect(kinds).toEqual(["Alert", "Button", "Card", "Input", "Select", "Stack", "Table", "Text"]);
    await expect(panel).toContainText("Acme Air");
    await expect(panel).toContainText("Northwind Hotel");

    const note = panel.locator('[data-state-key="review_note"]');
    const filter = panel.locator('[data-state-key="status_filter"]');
    await note.fill(`review-${index}`);
    await filter.selectOption("all");
    const action = panel.locator('[data-action="ApproveExpense"]');
    await action.click();
    await action.click();
    await expect(panel.locator('[data-runtime-status="true"]')).toHaveAttribute(
      "data-effect-count",
      "1",
    );
    await panel.locator('[data-host-action="update"]').click();
    await expect(note).toHaveValue(`review-${index}`);
    await expect(filter).toHaveValue("all");
    await panel.locator('[data-host-action="replay"]').click();
    await expect(panel).toHaveAttribute("data-replay", "true");
    await expect(panel.locator('[data-runtime-status="true"]')).toContainText("effects=0");
  }

  await mkdir(path.join(results, "screenshots"), { recursive: true });
  await page.screenshot({ path: path.join(results, "screenshots", "web-all-surfaces.png"), fullPage: true });
});
