# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: web.spec.mjs >> accepted direct RSX executes state, typed action receipt, and visible feedback
- Location: platform/direct-rsx/web.spec.mjs:9:1

# Error details

```
Error: [
  {
    "id": "aria-allowed-attr",
    "impact": "critical",
    "tags": [
      "cat.aria",
      "wcag2a",
      "wcag412",
      "EN-301-549",
      "EN-9.4.1.2",
      "RGAAv4",
      "RGAA-7.1.1"
    ],
    "description": "Ensure an element's role supports its ARIA attributes",
    "help": "Elements must only use supported ARIA attributes",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/aria-allowed-attr?application=playwright",
    "nodes": [
      {
        "any": [],
        "all": [
          {
            "id": "aria-allowed-attr",
            "data": [
              "aria-orientation=\"horizontal\""
            ],
            "relatedNodes": [],
            "impact": "critical",
            "message": "ARIA attribute is not allowed: aria-orientation=\"horizontal\""
          }
        ],
        "none": [],
        "impact": "critical",
        "html": "<div id=\"filter_toolbar\" data-component=\"Toolbar\" aria-orientation=\"horizontal\">",
        "target": [
          "div[data-component=\"Toolbar\"]"
        ],
        "failureSummary": "Fix all of the following:\n  ARIA attribute is not allowed: aria-orientation=\"horizontal\""
      }
    ]
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 42

- Array []
+ Array [
+   Object {
+     "description": "Ensure an element's role supports its ARIA attributes",
+     "help": "Elements must only use supported ARIA attributes",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/aria-allowed-attr?application=playwright",
+     "id": "aria-allowed-attr",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-orientation=\"horizontal\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-orientation=\"horizontal\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-orientation=\"horizontal\"",
+         "html": "<div id=\"filter_toolbar\" data-component=\"Toolbar\" aria-orientation=\"horizontal\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "div[data-component=\"Toolbar\"]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.aria",
+       "wcag2a",
+       "wcag412",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "RGAAv4",
+       "RGAA-7.1.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - text: Role · variant 1
      - combobox "Role · variant 1" [ref=e7]:
        - option "All"
        - option "Admin" [selected]
        - option "Member"
      - button "Apply · variant 1" [active] [ref=e8]
    - status [ref=e9]: receipt:ApplyFilter:people
  - navigation "Direct RSX navigation" [ref=e10]:
    - button "Previous Source" [disabled] [ref=e11]
    - button "Next Source" [ref=e12]
```

# Test source

```ts
  1  | import { mkdir, writeFile } from "node:fs/promises";
  2  | import path from "node:path";
  3  | 
  4  | import AxeBuilder from "@axe-core/playwright";
  5  | import { expect, test } from "@playwright/test";
  6  | 
  7  | const evidence = path.resolve(process.env.OPE11_DIRECT_RSX_EVIDENCE_DIR ?? "evidence/direct-rsx-web-local");
  8  | 
  9  | test("accepted direct RSX executes state, typed action receipt, and visible feedback", async ({ page }) => {
  10 |   await mkdir(path.join(evidence, "screenshots"), { recursive: true });
  11 |   const externalRequests = [];
  12 |   await page.route("**/*", async (route) => {
  13 |     const url = new URL(route.request().url());
  14 |     if (["127.0.0.1", "localhost"].includes(url.hostname)) await route.continue();
  15 |     else {
  16 |       externalRequests.push(url.origin);
  17 |       await route.abort("blockedbyclient");
  18 |     }
  19 |   });
  20 |   await page.goto("http://127.0.0.1:4185", { waitUntil: "networkidle" });
  21 |   const root = page.locator("#ope11-direct-rsx-root");
  22 |   await expect(root).toHaveAttribute("data-surface-count", "2");
  23 |   const manifestHash = await root.getAttribute("data-manifest-hash");
  24 |   const bindingSha256 = await root.getAttribute("data-binding-sha256");
  25 |   expect(manifestHash).toMatch(/^[a-f0-9]{64}$/);
  26 |   expect(bindingSha256).toMatch(/^[a-f0-9]{64}$/);
  27 |   const scenarios = [];
  28 |   let stateChanges = 0;
  29 |   for (let index = 0; index < 2; index += 1) {
  30 |     await expect(root).toHaveAttribute("data-current-index", String(index));
  31 |     const section = root.locator("section[data-scenario-id]");
  32 |     scenarios.push(await section.getAttribute("data-scenario-id"));
  33 |     const app = section.locator('[data-route="direct-rsx"]');
  34 |     const select = app.locator("select");
  35 |     if (await select.count()) {
  36 |       await select.selectOption({ index: 1 });
  37 |       await expect(select).not.toHaveValue("All");
  38 |       stateChanges += 1;
  39 |     }
  40 |     const action = app.locator("button[data-action]");
  41 |     await expect(action).toBeVisible();
  42 |     await action.click();
  43 |     const receipt = app.locator('[role="status"][data-receipt]');
  44 |     await expect(receipt).toHaveCount(1);
  45 |     await expect(receipt).toHaveAttribute("data-action-count", "1");
  46 |     await expect(receipt).toHaveAttribute("data-receipt", /^receipt:[A-Za-z]+:[a-z]+$/);
  47 |     await expect(receipt).toContainText("receipt:");
  48 |     const accessibility = await new AxeBuilder({ page }).analyze();
  49 |     const blocking = accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
> 50 |     expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
     |                                                         ^ Error: [
  51 |     await page.screenshot({ path: path.join(evidence, "screenshots", `direct-rsx-web-${index + 1}.png`), fullPage: true });
  52 |     if (index === 0) await page.getByRole("button", { name: "Next Source" }).click();
  53 |   }
  54 |   expect(stateChanges).toBeGreaterThanOrEqual(1);
  55 |   expect(externalRequests).toEqual([]);
  56 |   await writeFile(path.join(evidence, "direct-rsx-web.json"), `${JSON.stringify({
  57 |     platform: "web",
  58 |     route: "direct-rsx",
  59 |     scenarios,
  60 |     manifest_hash: manifestHash,
  61 |     binding_sha256: bindingSha256,
  62 |     passed: true,
  63 |     state_changed: true,
  64 |     action_receipts_exactly_once: true,
  65 |     visible_feedback: true,
  66 |     accessibility_blocking_findings: 0,
  67 |     screenshots: ["direct-rsx-web-1.png", "direct-rsx-web-2.png"],
  68 |   }, null, 2)}\n`);
  69 | });
  70 | 
```