# OPE-21 two-pass review

Review target: `codex/ope-21-hardening` against OPE-21 and base `d3cf420`.

## Standards pass

### Resolved OPE21-S1, high: threshold override could weaken preregistration

The first implementation accepted any positive `EVAL_MINIMUM_FREE_BYTES` value.
That allowed an operator to run below the registered 4 GiB minimum without changing
the candidate manifest.

Resolution: environment and CLI paths now reject every value below 4 GiB. Tests
prove the default, an allowed higher threshold, and rejection of a lower threshold.

### Resolved OPE21-S2, high: deterministic tests could use a second Cargo target

The first wrapper revision set the shared target for the Dioxus contract and provider
process, but did not export it before `npm test`. A Rust subprocess owned by the test
suite therefore created a separate catalog target inside the repository.

Resolution: the wrapper exports the shared Cargo target before bootstrap and tests.
The local catalog target was removed, the suite was rerun through the shared target,
and the repository-local catalog, evaluation-root, and Dioxus targets all remain absent.

### Remaining standards findings

None.

The gate does not reserve filesystem blocks against unrelated concurrent processes.
It instead checks after every deterministic step and immediately before generation.
This is an explicit residual operating risk, not a correctness defect in the registered
single-run contract.

## Intent pass

No remaining findings.

- The wrapper records six post-step checks and the runner records the seventh check
  immediately before the first provider call.
- A forced storage failure exits before the provider runner and retains
  `PRE_PROVIDER_INFRASTRUCTURE_FAILURE` with `provider_attempts: 0`.
- Catalog, normalizer, Direct RSX, Dioxus Web, Dioxus Desktop, and contract builds use
  one shared target outside the repository.
- The generated proof recorded implementation tree SHA-256
  `73e1166aac54b662ea4fca26e1929a074a0a8282658f745a71f82067520ff502`
  before and after platform execution, with no root target.
- The OPE-20 semantic fields listed by the preregistration are structurally identical.
- OPE-7 verdict ownership, OPE-12 blocking, human evidence requirements, and route
  separation remain unchanged.

## Verification

- Tests: 71 passed, 0 failed.
- Typecheck: passed.
- Dioxus contract: 1 passed, 0 failed.
- Shell syntax and `git diff --check`: passed.
- Complete fake-provider preflight: 80 cells, 84 retained attempts, zero external
  provider calls, operational preflight passed, expected `INVALID_EVAL` because real
  human evidence is absent.
- Generated complete-canary preflight: 8 cells, 12 retained attempts, zero external
  provider calls, React Web, Direct RSX Web, Dioxus Web, and Dioxus Desktop passed.
- Visual inspection: one real screenshot from each route contained rendered controls,
  interaction state or receipt evidence, and route navigation.
- Generated review packets: 8, with 15 content-addressed assets and no leakage finding.
- Credential findings: zero.
- Candidate manifest: `8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07`.
- Complete preflight `SHA256SUMS` SHA-256:
  `032925ad2e18d99c3b1a79b4a5f64714ed8c9afeb34be49e794117e8f238da81`.
- Generated preflight `SHA256SUMS` SHA-256:
  `73981f555b6cf680c7fc1445efd619658cef1bc8196efbe198de4b9b4811a636`.
- Generated independent review SHA-256:
  `183b4ca6a7ed5b42e557597e9fec28542b2803736d6503936fed5441eb7ab5d1`.

## Verdict

OPE-21 passes standards and intent review. OPE-22 may start only from the exact
committed candidate manifest above. No provider call occurred during OPE-21.
