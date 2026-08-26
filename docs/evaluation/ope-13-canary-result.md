# OPE-13 symmetric accessibility canary result

## Result

The single authorized provider-backed canary result is `CANARY_INVALID`.
OPE-12 must not run, and no product verdict is authorized.

The candidate used `gpt-5.6-luna` with low reasoning through the ChatGPT plan.
It made 11 provider calls and consumed 134,476 measured provider tokens. Six of
the eight final route cells were accepted.

## Exact failure

The `02-preferences-v1` cell failed after one repair on both typed JSON and
official `json-render`.

The symmetric accessibility contract required a visible, politely announced
`status` receipt. Luna implemented that requirement by adding a `Toast` to both
routes. The route-neutral semantic coverage check then rejected the added
component with `component-kinds` because the frozen Preferences oracle did not
contain a Toast.

This is a contradiction between the new feedback requirement and the frozen
component-kind oracle. It is not a provider outage or an infrastructure error.
The result cannot be repaired or rerun under the OPE-13 preregistration.

Direct RSX required one repair on the filter scenario, then passed. OpenUI
passed its two scheduled cells on the first attempt. Generated-output platform
proofs did not run because two generation cells remained rejected.

## Frozen evidence

- Source commit: `f7550a778578f293da8c46fd21736e4211927ce3`
- Candidate manifest: `1aff97c12c5c99810ca358ed1ba7770c55bdfc4585c15c62db21125a0175616d`
- Candidate checksum manifest SHA-256: `de2bf28ff4ceb36c2cc39479d811e37c300e4f43543c1384ffe7aaaeea062356`
- Independent review SHA-256: `e34a75b5221e347814ed64775ea1d118ab082d54b3219da7511d5b5e9ef63dc6`
- Summary SHA-256: `d22c4a6543e4cea834af00e677a3a9b152d5e790c8ec9499a33e0faec5fc3421`
- Records SHA-256: `1f661224cadc15743781d236094826e778f55928bff0b7aa41bfe0900680e56f`
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope13-canary-f7550a7-final/`

`shasum -a 256 -c SHA256SUMS` passes. The credential scan contains no
findings. Independent recomputation confirms 11 records, eight route cells,
six accepted final cells, no platform proof, and zero product-scorer access.

The evidence intentionally has no `PUBLICATION.json`. An invalid candidate is
not promoted.

## Consequence

OPE-13 is complete with an invalid result. OPE-12 remains blocked and OPE-7
cannot issue `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or
`INVALID_EVAL` from this candidate.

Any future attempt to reconcile host-provided feedback with component-kind
coverage requires a new ticket, a new preregistration, and explicit approval.
It cannot be presented as a continuation or retry of OPE-13.
