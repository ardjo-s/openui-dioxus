# OPE-12 decision-grade execution register

This register is committed before the only authorized OPE-12 provider-backed
generation window. Human and assistive-technology evidence is collected afterward,
then attached through the provider-free finalizer.

## Frozen candidate

- Source ticket: OPE-22.
- Exact source commit: `1bcdbe6`.
- Candidate manifest SHA-256: `8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07`.
- Implementation tree SHA-256: `73e1166aac54b662ea4fca26e1929a074a0a8282658f745a71f82067520ff502`.
- OPE-22 evidence directory:
  `prototype/ecosystem-relative-eval/evidence/ope22-hardened-canary-de5fbf3-final`.
- OPE-22 `SHA256SUMS` SHA-256:
  `1a94bc820842ef4b65435d21e3c3e1b1ddf3a9b566d93a340332f9a62b54c2dd`.
- OPE-22 independent review SHA-256:
  `3e3b539976bb5c9000ada734364281cb7bfef2b57897bbfd06296c7c0a6d5a31`.

The candidate must recompute byte-identically immediately before generation. Any
implementation, prompt, scenario, schedule, catalog, tool identity, platform
baseline, assignment, schema, threshold, or methodology change invalidates this
authorization and requires a new canary.

## One-shot generation contract

- Run kind: `complete`.
- Provider: Codex CLI through the ChatGPT plan.
- Model: `gpt-5.6-luna`.
- Reasoning effort: `low`.
- Tools: disabled.
- Fresh isolated process per attempt.
- Schedule: the exact 80-cell complete schedule in strict manifest order.
- Repairs: at most one per cell.
- Provider attempts: at most 160.
- Wall time: at most four hours.
- Output: one new directory named
  `ope12-decision-grade-<preregistration-commit>-generation`.

The provider command may be started once. There is no silent rerun, pooling,
replacement, or second generation window. A pre-provider infrastructure failure with
zero attempts does not start the provider window, but its diagnostic remains retained.

## Mandatory pre-provider gates

1. Exact source commit, clean worktree, and candidate manifest verification.
2. Empty output directory and absent pre-provider sidecar.
3. Bootstrap, 71-test suite, typecheck, Dioxus contract, shell syntax, and Codex
   authentication checks.
4. Deterministic complete preflight covering all 80 cells with zero external calls.
5. At least 4 GiB free after every wrapper step and immediately before generation.
6. One shared Cargo target outside the repository and no repository-local target.
7. Synthetic fixtures and pre-provider credential scans only.

## Two-stage evidence boundary

The generation stage must retain all 80 cells, generated platform evidence, review
packets, checksums, and a candidate marker with status `awaiting-human-evidence`.
Its expected interim outcome is `INVALID_EVAL` solely because the real human evidence
file has not yet been supplied. That interim state is not the final OPE-12 result.

After generation, the registered correction operators, blind reviewers, keyboard,
VoiceOver, TalkBack, mobile, replay, migration, drill, cost, and applicability stages
produce real hash-addressed evidence. The provider-free finalizer copies those assets
into the private archive, validates all records, preserves every generation byte, and
emits `READY_FOR_REVIEW` or `INVALID_EVAL`.

## Downstream state

- `READY_FOR_REVIEW` permits OPE-7 to compute the product verdict.
- `INVALID_EVAL` stops without a product verdict or provider rerun.
- OPE-7 alone may emit `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or
  `INVALID_EVAL`.
- Production implementation starts only after `GO_OPENUI_DIOXUS`.
- This register authorizes no push, pull request, merge, publication, or marketing
  claim.
