# Make the go or no-go decision

Type: `grilling`
Status: `resolved`
Blocked by: 04, 09

## Question

Does measured usability, correctness, portability, maintenance cost, and differentiation justify continuing from prototype to OSS `v0.1`?

## Adapter and platform implication

Go/no-go evidence must include catalog addition or swap cost, PlatformHost fidelity, any runtime changes required by a new adapter, and the honesty of the certification claim. Failure to keep the runtime stable is evidence against the architecture.

## Decision

Outcome: `INVALID_EVAL`.

Do not start the OpenUI-Dioxus OSS `v0.1` build from this evidence set.

The unique OPE-12 complete run used the promoted byte-identical manifest, retained all
80 route cells and 96 attempts, passed every storage and integrity check, and had no
provider or infrastructure error. Eleven cells nevertheless remained invalid after
their only repair. Required generated platform evidence and all subsequent human,
assistive-technology, mobile, maintenance, cost, and applicability evidence therefore
do not exist.

The registered integrity rule requires `INVALID_EVAL` whenever the decision-grade
evidence set is incomplete. It forbids converting partial adverse evidence into
`NO_GO`, and it forbids converting technical prototype success into `GO` or `PIVOT`.

One directly comparable signal is still worth retaining: runtime-uncertain OpenUI
reached 17/20 after repair versus typed JSON at 20/20. OpenUI therefore also missed the
registered 19/20 minimum and the maximum one-scenario disadvantage. That signal blocks
GO for this run, but it does not replace the missing evidence needed for a complete
product verdict.

The separate OPE-3 protocol evaluation remains valid: OpenUI beat A2UI and tied typed
JSON on its closed eight-component Web and Desktop benchmark. That result supports the
protocol choice within its narrow scope, but cannot override the deeper product
evaluation's integrity failure.

Evidence:

- [OPE-12 two-pass review](../evaluation/ope-12-two-pass-review.md)
- [OPE-7 final verdict](../evaluation/ope-7-final-verdict.md)
- [OPE-3 controlled protocol report](../../prototype/openui-a2ui-cloud-eval/evidence/three-arm-controlled-run-2026-08-24/RUN-REPORT.md)
- OPE-12 evidence commit `5454b37`
- OPE-12 generation checksum
  `5e04615ca018d822db6cbd54845b5eb5363f7f23f08c8dde2afcef06a15c4c79`

Production runtime work, OSS packaging, converters, governance, grants, and marketing
claims remain blocked. Any future attempt is a new preregistered evaluation with a new
canary, never a rerun or pooled continuation of this evidence.
