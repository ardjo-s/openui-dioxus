# OPE-3 final evidence review

Date: 2026-08-24

Outcome: **PASS**

An independent read-only review recomputed the archive from `records.jsonl` and
found no blocker.

## Independently recomputed

- calls: 83 — OpenUI 23, A2UI 40, typed JSON 20;
- first-pass validity: OpenUI 17/20, A2UI 0/20, typed JSON 20/20;
- post-repair validity: OpenUI 19/20, A2UI 12/20, typed JSON 20/20;
- accepted final Surfaces: 51;
- cumulative raw tokens: OpenUI 34,470, A2UI 79,663, typed JSON 32,651;
- OpenUI vs A2UI: `OPENUI_WIN`;
- OpenUI vs typed JSON: `TIE`;
- A2UI vs typed JSON: typed JSON wins as secondary context.

## Evidence checks

- every record's raw payload, diagnostics, Surface, and preregistered prompt
  binding verifies;
- preregistration hash matches `generation.json` and the frozen pack;
- Desktop and Chromium Web pass for all 51 accepted Surfaces;
- Playwright reports one expected test and zero unexpected tests;
- shared runtime behavior diff is zero lines;
- the OPE-1 checksum manifest verifies and its archive remains unchanged from
  commit `9014273`;
- no credential value was detected and the environment records
  `api_key_used: false`.

## Post-run visual inspection

The automated macOS capture selected a 34-pixel auxiliary WebView window and
produced an unusable black strip in `desktop-all-surfaces.png`. This did not
affect the native `DIOXUS_RENDERED surfaces=51` marker or the scored runtime
probe, but it was not accepted as qualitative visual evidence.

The same frozen binary and archived 51-Surface input were relaunched without
changing code, prompts, validators, records, or scoring. The named 800×632
`Dioxus App` window was captured as `desktop-visual-review.png` and visually
confirmed to contain the real expense-review UI. The original malformed capture
is preserved for transparency. The macOS window-selection helper must be fixed
before OPE-2 rather than rewritten after this run's preregistration.
