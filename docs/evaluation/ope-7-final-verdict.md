# OPE-7 final verdict

## Outcome

`INVALID_EVAL`

This is the only outcome supported by the frozen evidence. It is not
`GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, or `NO_GO`.

## Authoritative evidence

- OPE-6 platform evidence passed on Web, Desktop, iOS Simulator, and Android Emulator
  in workflow run `32847665208` at commit `d7bb0a9`.
- [OPE-6 evidence review](../research/ope-6-platform-evidence-review.md)
- OPE-12 used manifest
  `8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07`.
- OPE-12 evidence commit: `5454b37`.
- OPE-12 generation archive:
  `prototype/ecosystem-relative-eval/evidence/ope12-decision-grade-a84beb0-generation`.
- OPE-12 `SHA256SUMS` SHA-256:
  `5e04615ca018d822db6cbd54845b5eb5363f7f23f08c8dde2afcef06a15c4c79`.
- OPE-12 two-pass review:
  `docs/evaluation/ope-12-two-pass-review.md`.

## Separate protocol evidence

The frozen OPE-3 three-arm protocol evaluation remains valid and separate from the
OPE-12 product-potential evaluation.

- OpenUI-Dioxus versus A2UI-Dioxus: `OPENUI_WIN`.
- OpenUI-Dioxus versus typed JSON Dioxus: `TIE`.
- Typed JSON Dioxus versus A2UI-Dioxus, secondary context: typed JSON won.
- OpenUI post-repair validity: 19/20.
- A2UI post-repair validity: 12/20.
- Typed JSON post-repair validity: 20/20.
- Desktop, Web, runtime semantics, and zero shared-runtime behavior diff: passed.

[OPE-3 controlled three-arm report](../../prototype/openui-a2ui-cloud-eval/evidence/three-arm-controlled-run-2026-08-24/RUN-REPORT.md)

This protocol evidence supports OpenUI over A2UI for the closed eight-component
generation benchmark. It does not prove product value, Dioxus Components breadth,
maintenance, accessibility, iOS, or Android, and it cannot override OPE-12.

## Gate application

The integrity gate runs before quality, maintenance, cost, ecosystem, or material
advantage scoring. It requires `INVALID_EVAL` when any scenario, required platform
artifact, correction record, blind review, accessibility record, mobile record,
maintenance drill, cost record, or applicability record is missing.

OPE-12 retained every scheduled cell, but 11 cells remained invalid after their only
repair. The runner therefore skipped generated platform proof and could not create
decision-grade review packets. Human and assistive-technology collection cannot repair
invalid model outputs and did not run.

The missing evidence classes are:

- generated Web and Desktop platform proof for the accepted complete set
- blind review packets and three reviewer records
- two-operator correction evidence
- keyboard, VoiceOver, and TalkBack evidence
- rendered iOS and Android evidence
- replay and migration evidence
- five maintenance drills
- first-adoption and steady-state cost evidence
- requirement applicability evidence

## Independently recomputed machine facts

- Route cells: 80.
- Provider attempts: 96.
- Repairs: 16.
- Provider error: none.
- Infrastructure error: none.
- Storage gates: 7/7 passed.
- Credential findings: zero.
- Canonical runtime behavior diff: zero lines.
- Runtime-uncertain post-repair validity: OpenUI 17/20, typed JSON 20/20,
  json-render 12/20.
- Compile-known post-repair validity: OpenUI 5/5, typed JSON 5/5, json-render 5/5,
  Direct RSX 5/5.
- Final invalid cells: OpenUI 3, json-render 8.
- Provider usage: 1,184,253 input tokens, 627,712 cached input tokens, 33,569
  output tokens, 14,846 reasoning tokens, and 1,217,822 total tokens.

The OpenUI runtime-uncertain result also misses the registered primary validity gate:
at least 19/20 and no more than one scenario behind typed JSON. This prevents GO for
the frozen run, but the broader incomplete evidence set still requires the formal
`INVALID_EVAL` outcome rather than `NO_GO`.

## Review passes

Standards pass: no evidence-integrity defect changes the outcome. The misleading
`CANDIDATE.json` status `awaiting-human-evidence` is contained by the authoritative
nonzero wrapper result, `operational_preflight_passed: false`, missing platform proof,
and explicit generation-incomplete diagnostic.

Intent pass: the registered stop rule was applied without rerun, score pooling,
baseline substitution, inferred platform parity, fabricated human evidence, or access
to the product scorer during OPE-12.

## Build consequence

Do not start product implementation. OSS packaging, converters, governance, grants,
and marketing claims remain blocked. A future attempt requires a new preregistration,
new manifest, and new canary. It cannot reuse or pool this run as a passing evaluation.
