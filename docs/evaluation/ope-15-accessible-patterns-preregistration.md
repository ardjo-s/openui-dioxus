# OPE-15 route-neutral accessible-pattern preregistration

OPE-15 is a deterministic methodology slice with zero provider calls. It does
not retry, amend, pool, or reinterpret OPE-13 or OPE-14. It may only prepare a
candidate manifest for OPE-16 after every deterministic gate passes.

## Frozen predecessor

- OPE-14 source commit: `7493040232a649bfced0c1b9e08ea45cbc7681ed`.
- OPE-14 evidence commit: `59858eb097bbf10807c156d7aa16bc460805829f`.
- OPE-14 outcome: `CANARY_INVALID`.
- OPE-14 evidence directory: `prototype/ecosystem-relative-eval/evidence/ope14-canary-7493040-final`.
- Candidate manifest SHA-256: `9c04bfaaa25748aef86b97e40c4885ca387a4718b6759324d6c072616a065254`.
- `SHA256SUMS` SHA-256: `bfd0d927a5c795bfab46b5e68974a7056ef7d670012cff68bb3b0b04764dbbe8`.
- Independent review SHA-256: `8704af6386db48f17941f251552ea72e7dc98a3f24264c4ab021a5b23da1428d`.
- Pinned Dioxus Components source: `bf007c15d0cf4d04d3181cc46cf12325aa773955`.

## Registered asymmetry

OPE-14 treated the element carrying `data-component` as the only possible
semantic witness. The rejected Direct RSX Select used a marked wrapper around a
native Select control. The pinned Dioxus Components implementation uses the
same composition style:

1. `Select` puts `data-component="Select"` on an outer `div`, while its trigger
   is an internal button with popup-listbox semantics.
2. `Tabs` puts `data-component="Tabs"` on an outer `div`, while an internal
   element carries `role="tablist"` and owns tabs and tab panels.
3. `DialogRoot` may put the catalog marker on a wrapper while `DialogContent`
   carries `role="dialog"`.

The OPE-14 oracle therefore imposed a stricter representation rule on Direct
RSX than on Dioxus Components. OPE-15 replaces that rule with one observable
contract applied to real rendered output from every route.

## Owned semantic region

A catalog component owns:

1. its marked root;
2. every descendant until another `data-component` root begins;
3. no host receipt carrying `data-receipt`;
4. no semantic witness owned by a nested catalog component.

Exactly one approved pattern must match inside that region. Zero matches fail.
Multiple matches fail as ambiguous. Accessible names, focusability, state, and
relationships are checked on the matched witness, not automatically on the
catalog marker.

## Frozen patterns

| Component | Approved observable pattern |
| --- | --- |
| Toolbar | Named toolbar with the declared orientation. Missing orientation is valid only for the horizontal ARIA default. |
| Avatar | Named image. |
| Label | Native or equivalent label associated with its declared control. |
| Input | Named textbox reachable through native keyboard behavior. |
| Select | Named native select or combobox, or a named button with `aria-haspopup=listbox` and Boolean `aria-expanded`. An expanded popup must control an owned listbox. |
| Checkbox | Named checkbox with native or equivalent keyboard behavior. |
| Switch | Named switch with a Boolean checked state, reachable and operable from the keyboard. |
| Button | Named native or equivalent button reachable from the keyboard. |
| Tabs | Named tablist with at least one named keyboard-operable tab and one tab panel in the owned region. |
| Dialog | Named dialog. Browser execution separately proves focus containment while open. |
| Progress | Named progressbar. |
| Toast | Named implicit-polite status, or a keyboard-reachable alert dialog that owns an alert announcement. |

Route-native HTML and internal roles may differ only through these registered
patterns. Component counts, stable IDs, state, actions, update behavior, replay,
host receipt ownership, and catalog coverage remain unchanged.

## Shared adapter correction

The real five-workflow Dioxus SSR probe found one protocol-independent adapter
defect: vertical Toolbar output exposed `data-orientation="vertical"` but not
`aria-orientation="vertical"`. OPE-15 permits exactly one shared CatalogAdapter
change to add the ARIA attribute. OpenUI and typed JSON use the same adapter, so
this cannot advantage either primary arm. The canonical runtime diff must stay
at zero lines.

No other catalog, runtime, scenario, schedule, provider, threshold, repair,
platform, trust-control, or evidence-schema change is permitted.

## Deterministic promotion gate

OPE-15 may make OPE-16 executable only when all of the following are true:

1. OPE-13 and OPE-14 evidence hashes remain exact.
2. Public-seam negative and positive fixtures pass.
3. The same validator accepts real Dioxus Components SSR, official json-render
   React, and direct-RSX reference output.
4. Generated-output Web and Desktop preflight passes for all four routes.
5. The manifest differential reports only this pattern contract, the single
   Toolbar adapter correction, probes, preregistration, and derived hashes.
6. Typecheck, full tests, Dioxus contract tests, standards review, and intent
   review pass.
7. External provider call count remains zero.

OPE-15 emits no product verdict. OPE-16 remains a separate new evaluation with
one preregistered Luna-low canary. OPE-12 remains canceled until OPE-16 returns
`PASS`.
