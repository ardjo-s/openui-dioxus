# OPE-14 feedback ownership canary preregistration

## Purpose

OPE-14 corrects one contradiction exposed by OPE-13. The original shared
scenario contract says the host owns action receipts and generated payloads
must not encode host operations as components. OPE-13 nevertheless required
announced feedback in every generated payload. Luna reasonably added a Toast
to Preferences, then the frozen component-kind oracle rejected it.

OPE-14 is a new evaluation. It does not rewrite, pool, or retry OPE-13.
OPE-13 remains `CANARY_INVALID`.

## The only permitted methodological change

Feedback has two explicit owners:

1. Surface feedback belongs to the generated payload only when the frozen
   business scenario requires a feedback component such as Toast.
2. The synthetic action receipt belongs to the evaluation host. The harness
   renders it visibly with `role=status` and `aria-live=polite`, exactly once,
   outside `data-component` coverage.

When `surface_feedback.required` is false, every route prompt explicitly
forbids adding Toast or another replacement feedback component. When it is
true, the required component remains part of the frozen Surface contract and
must meet its accessibility semantics.

OpenUI, typed JSON, official json-render, and direct RSX receive the same
ownership rule. Route-native harness mechanics may differ, but no route gets a
weaker observable requirement.

## Prior result remains immutable

- OPE-13 source commit: `f7550a778578f293da8c46fd21736e4211927ce3`
- OPE-13 evidence commit: `8565be6776f0f524b5bfa981c5e9b4cfe38e0d6e`
- OPE-13 manifest: `1aff97c12c5c99810ca358ed1ba7770c55bdfc4585c15c62db21125a0175616d`
- OPE-13 checksum manifest SHA-256: `de2bf28ff4ceb36c2cc39479d811e37c300e4f43543c1384ffe7aaaeea062356`
- OPE-13 independent review SHA-256: `e34a75b5221e347814ed64775ea1d118ab082d54b3219da7511d5b5e9ef63dc6`
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope13-canary-f7550a7-final/`

## Frozen dimensions

The provider, `gpt-5.6-luna` low reasoning, scenarios, schedule, route order,
one-repair ceiling, call and wall-time limits, thresholds, scorer, trust
controls, execution targets, and evidence schema remain byte-for-byte equal to
the OPE-13 manifest. Only the feedback ownership contract, affected prompts,
validators, probes, documentation, and derived hashes may differ.

## Execution rule

The complete source, prompts, validators, probes, manifest, and hashes must be
committed after a generated-output Web and Desktop preflight passes. OPE-14 may
then execute exactly one provider-backed canary.

- `PASS`: promote only the byte-identical manifest and reopen OPE-12.
- `CANARY_INVALID`: stop and keep OPE-12 canceled.

OPE-14 cannot emit a product verdict. OPE-7 remains the only ticket allowed to
issue the final product outcome after all required evidence exists.
