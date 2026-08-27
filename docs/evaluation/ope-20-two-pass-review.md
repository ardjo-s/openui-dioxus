# OPE-20 two-pass review

## Comparison

- Target: `codex/ope-20-complete-run-canary`.
- Base: OPE-19 final commit `95b261a`.
- Provider source commit: `84e30b4`.
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope20-complete-canary-84e30b4-final`.

## Standards pass

### OPE20-S1, high: no free-space gate before the provider window

`scripts/run-canary.sh` validates authentication, runs tests, and then starts the
provider runner without reserving or checking sufficient disk for generated
platform builds. The one provider window accepted all eight cells, but later
Dioxus links failed with `errno=28`. This converts a detectable local resource
condition into an irreversible invalid canary.

Smallest safe fix: preregister a minimum-free-space threshold measured after all
pre-provider tests and immediately before the provider runner starts. Failure
must stop with zero provider attempts and a retained pre-provider diagnostic.

This is not safely auto-fixable on OPE-20 because its frozen source has already
consumed the one provider window.

## Intent pass

### OPE20-I1, high: Dioxus build output is not isolated from the hashed tree

The manifest excludes `platform/dioxus/target`, but the Dioxus Web execution is
not given an explicit target directory. During OPE-20 it created a root
`target/` inside `prototype/ecosystem-relative-eval`, changing the recomputed
implementation-tree hash after generation. Removing only that untracked build
restored the exact frozen manifest, proving the drift source.

Smallest safe fix: route every Cargo and Dioxus build through one explicit
excluded target directory, assert that no other target directory appears, and
test manifest equality before and after generated platform orchestration.

This is not safely auto-fixable on OPE-20. It requires a new deterministic
hardening ticket, followed by a separately approved canary.

## Verified archive facts

- Manifest is byte-identical to OPE-19 after generated build cleanup.
- Exactly 10 provider attempts are retained for 8 final accepted cells.
- One repair maximum is preserved.
- Provider error is absent.
- React Web and Direct RSX Web passed.
- Dioxus Web and Desktop failed from disk exhaustion.
- Credential findings are zero.
- Candidate checksums pass.
- Independent recomputation reports `platform-evidence-invalid` and
  `review-packet-count-mismatch`.
- No publication marker or product verdict exists.
- Source and documentation pass `git diff --check`. Two immutable raw failure
  logs retain provider-produced trailing spaces and are intentionally not
  rewritten after checksumming.

## Verdict

OPE-20 is correctly `CANARY_INVALID`. OPE-12 remains blocked. The archive must
not be reinterpreted as a protocol failure because all eight generated cells
were accepted, and it must not be reinterpreted as PASS because required Dioxus
platform evidence is absent.
