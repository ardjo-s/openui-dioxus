# OPE-21 deterministic disk and manifest hardening

OPE-21 is a deterministic harness correction with zero external provider calls.
It does not reinterpret or pool the OPE-20 generation evidence. It fixes the two
infrastructure defects found by the OPE-20 standards and intent review before one
separately authorized OPE-22 canary may start.

## Prior candidate

- OPE-20 outcome: `CANARY_INVALID`.
- Source commit before generation: `84e30b4`.
- Evidence commit: `32f5925`.
- Closing commit: `d3cf420`.
- Candidate manifest SHA-256: `1973db76a604ed0e4378e0fc0e0775be8f29e9cc8ba957599a0c17870bd4a3e3`.
- Evidence checksum SHA-256: `335008e3f9bac2c15ffd0ad2d1a3967313ed98a6ab00cb4a31f463744c703363`.
- Independent review SHA-256: `c3f4bf5f16008f257c60caf6d21102cd3a9c24192afb2696471124446fc8f5c9`.

The invalid result remains immutable. OPE-20 is never rerun or pooled with OPE-22.

## Registered correction

1. Require at least 4 GiB free on every filesystem used for provider evidence and
   the shared Cargo target.
2. Check the same threshold after bootstrap, tests, typecheck, the Dioxus contract,
   shell syntax, authentication verification, and immediately before the first
   provider call.
3. A failed check writes a machine-readable pre-provider infrastructure record,
   records zero provider attempts, and stops before generation.
4. Route catalog, normalizer, Direct RSX, Dioxus Web, Dioxus Desktop, and contract
   builds through one explicit Cargo target outside the repository and frozen tree.
5. Reject any generated root `target/` in the frozen implementation tree.
6. Recompute the implementation-tree manifest after generated platform proof and
   require byte-identical file count, bytes, nonblank lines, and SHA-256.

The 4 GiB default is conservative relative to the previously observed 2.3 GiB
combined Rust build cache. It also stays well above the approximately 1 GiB free
window in which OPE-20 exhausted disk during Dioxus linking.

## Confirmed TDD seams

- Storage seam: injected filesystem facts independently prove reject and accept
  behavior without invoking a provider.
- Build-isolation seam: an injected root build artifact changes the implementation
  manifest, is rejected, and restores the exact prior hash after removal.

## Frozen unchanged dimensions

The provider, model, reasoning effort, route instructions, user prompts, scenarios,
cohorts, balanced order, repairs, response limits, action policy, accessibility
contract, evidence schema, scoring thresholds, human evidence rules, and OPE-7
verdict ownership remain byte-for-byte or structurally identical to OPE-20.

## Completion gate

OPE-21 completes only after the deterministic suite, typecheck, Dioxus contract,
shell syntax, full fake-provider complete preflight, generated eight-cell platform
preflight, recursive hashes, credential scan, and two-pass review pass. The resulting
manifest becomes the only candidate OPE-22 may use.

No provider call, push, pull request, merge, publication, OPE-12 execution, or OPE-7
product verdict is permitted by this ticket.
