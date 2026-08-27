# OPE-22 hardened complete-run canary execution

This document is committed before the only authorized provider-backed OPE-22 run.

## Frozen candidate

- Source ticket: OPE-21.
- Exact source commit: `64d329f`.
- Candidate manifest SHA-256: `8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07`.
- Implementation tree SHA-256: `73e1166aac54b662ea4fca26e1929a074a0a8282658f745a71f82067520ff502`.
- OPE-21 generated evidence `SHA256SUMS` SHA-256:
  `73981f555b6cf680c7fc1445efd619658cef1bc8196efbe198de4b9b4811a636`.
- OPE-21 independent review SHA-256:
  `183b4ca6a7ed5b42e557597e9fec28542b2803736d6503936fed5441eb7ab5d1`.

The candidate must recompute byte-identically immediately before execution. Any
implementation, prompt, scenario, catalog, tool identity, platform baseline, or
registered methodology change invalidates this authorization.

## One-shot provider contract

- Run kind: `complete-canary`.
- Provider: Codex CLI through the ChatGPT plan.
- Model: `gpt-5.6-luna`.
- Reasoning effort: `low`.
- Tools: disabled.
- Fresh isolated session per attempt.
- Schedule: the exact eight OPE-21 complete-run harness cells across both cohorts
  and all four routes.
- Repairs: at most one per cell.
- Provider attempts: at most 16.
- Wall time: at most 30 minutes.
- Output: one new directory named
  `ope22-hardened-canary-<preregistration-commit>-final`.

The provider command may be started once. There is no silent rerun, pooling, output
replacement, or second canary. A pre-provider storage failure with zero attempts does
not start the provider window, but its diagnostic remains retained.

## Mandatory pre-provider gates

1. Exact source commit and candidate manifest verification.
2. Empty output directory and absent sidecar record.
3. Bootstrap, 71-test suite, typecheck, Dioxus contract, shell syntax, and Codex
   authentication checks.
4. At least 4 GiB free after every deterministic step and immediately before the
   first provider call. The threshold may be raised but never lowered.
5. One shared Cargo target outside the repository.
6. No repository-local catalog, evaluation-root, or Dioxus target.
7. Synthetic fixtures and pre-provider credential scans only.

## Result classification

`PASS` requires:

- all eight final route cells accepted within the registered repair budget;
- generated React Web, Direct RSX Web, Dioxus Web, and Dioxus Desktop evidence;
- typed state, action, update, inert replay, and accessible-pattern proof;
- eight blinded packets bound to generated content-addressed assets;
- the expected nested human-evidence block;
- zero credential findings and zero canonical runtime behavior diff lines;
- byte-identical implementation tree before and after platform proof;
- no root target and independently verified recursive hashes.

Any missing requirement yields `CANARY_INVALID`. Evidence is archived and the run is
never repeated.

## Downstream state

- `PASS` may reopen OPE-12 only for this exact candidate manifest.
- `CANARY_INVALID` leaves OPE-12 canceled.
- OPE-7 alone owns `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or
  `INVALID_EVAL`.
- OPE-22 emits no product verdict and authorizes no push, pull request, merge,
  publication, full OPE-12 run, or production implementation.
