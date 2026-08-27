# OPE-12 two-pass review

Review target:
`prototype/ecosystem-relative-eval/evidence/ope12-decision-grade-a84beb0-generation`
against OPE-12, preregistration commit `a84beb0`, and frozen manifest
`8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07`.

## Standards pass

The archive is valid evidence of an invalid evaluation.

- One complete provider window executed with ChatGPT-plan Luna low and tools
  disabled. It retained 96 attempts for all 80 registered cells within the one-repair
  ceiling.
- All seven storage gates passed at the frozen 4 GiB minimum. No provider,
  authentication, timeout, storage, or infrastructure error occurred.
- The manifest and implementation tree stayed byte-identical. No repository-local
  target exists.
- Every checksum in the generation archive verifies. Credential findings and canonical
  runtime behavior differences are both zero.
- The product scorer was never accessed and no product verdict appears in the archive.

### Contained standards finding OPE12-S1

`CANDIDATE.json` records `status: awaiting-human-evidence` even though generation is
incomplete and the summary records `operational_preflight_passed: false`. The wrapper
still exits nonzero and the finalization diagnostics correctly contain
`generation: incomplete` and `platform: incomplete`, so the archive cannot be mistaken
for `READY_FOR_REVIEW` by the registered finalizer.

This status label is misleading and should become generation-aware before any future
evaluation family reuses the harness. It does not authorize human collection or a
provider rerun for this frozen evaluation.

## Intent pass

The registered stop rule fired correctly.

- First-pass validity was OpenUI 22/25, typed JSON 22/25, json-render 17/25, and
  Direct RSX 3/5.
- After one repair maximum, OpenUI reached 22/25, typed JSON 25/25, json-render
  17/25, and Direct RSX 5/5.
- In the directly comparable runtime-uncertain cohort, OpenUI reached 17/20 versus
  typed JSON 20/20. This misses the registered OpenUI minimum of 19/20 and exceeds the
  maximum one-scenario disadvantage.
- All four routes reached 5/5 in the compile-known cohort. Direct RSX therefore has no
  unresolved compile-known validity failure in this run.
- Eleven cells remained invalid after repair: three OpenUI cells and eight json-render
  cells. Every failure and rejected repair is retained and charged.
- Because generation was incomplete, generated platform proof, blinded packets, human
  correction, accessibility, mobile, maintenance, cost, and applicability collection
  did not run. Collecting them cannot repair the missing accepted outputs.

The OpenUI validity result is adverse evidence, but the frozen integrity rule is
decisive: missing accepted scenarios make the formal product evaluation
`INVALID_EVAL`. OPE-7 must not convert this incomplete archive into `NO_GO`, `PIVOT`,
or `GO`.

## Final invalid cells

OpenUI:

- `04-status-dialog-v1`
- `04-status-dialog-v3`
- `05-navigation-feedback-v3`

json-render:

- `03-filter-action-v2`
- `04-status-dialog-v1`
- `04-status-dialog-v2`
- `04-status-dialog-v4`
- `05-navigation-feedback-v1`
- `05-navigation-feedback-v2`
- `05-navigation-feedback-v3`
- `05-navigation-feedback-v4`

## Independent verification

- Route cells: 80.
- Provider attempts: 96.
- Wall time: 994.526 seconds.
- Provider usage: 1,184,253 input tokens, 627,712 cached input tokens, 33,569
  output tokens, 14,846 reasoning tokens, and 1,217,822 total tokens.
- Independently recomputed first-pass, post-repair, final-failure, cohort, and raw-token
  totals match `summary.json`.
- Recursive checksum verification: passed.
- `SHA256SUMS` SHA-256:
  `5e04615ca018d822db6cbd54845b5eb5363f7f23f08c8dde2afcef06a15c4c79`.
- Implementation tree before and after:
  `73e1166aac54b662ea4fca26e1929a074a0a8282658f745a71f82067520ff502`.
- Credential findings: zero.
- Provider error: none.

## Verdict

OPE-12 ends as `INVALID_EVAL`. The archive is complete enough to prove that outcome
and must not be rerun or extended with human evidence. OPE-7 may now emit only the
registered final `INVALID_EVAL` and keep production implementation blocked.
