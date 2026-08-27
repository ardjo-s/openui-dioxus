# OPE-20 complete-run harness canary execution register

The user approved OPE-20. This register is committed before the only permitted
provider-backed run.

## Frozen candidate

- OPE-19 final commit: `95b261a`.
- OPE-19 implementation and evidence commit: `b2d78b6`.
- Candidate manifest SHA-256: `1973db76a604ed0e4378e0fc0e0775be8f29e9cc8ba957599a0c17870bd4a3e3`.
- Full deterministic evidence: `prototype/ecosystem-relative-eval/evidence/ope19-complete-runner-preflight-final`.
- Generated harness evidence: `prototype/ecosystem-relative-eval/evidence/ope19-complete-canary-generated-preflight-final`.
- Full deterministic `SHA256SUMS` SHA-256: `04cd7797e5c240d35f9f8dc1504db13d009d4dca297699f3c39151ba7665b367`.
- Generated harness `SHA256SUMS` SHA-256: `e2b3b27165bccaf6bd15526db43802b0345d5492300c1f78a46d4fe0c014bfd1`.
- Generated harness independent review SHA-256: `3101db1a7b64ce46e0d3c7f381b9b9e84d8aeb1e9f1c32075236a9309917b317`.

The candidate was recomputed in the isolated OPE-20 worktree and matched before
this register was committed. Any later mismatch stops before generation.

## Frozen execution

- Provider: ChatGPT plan through the installed Codex CLI.
- Model: `gpt-5.6-luna`.
- Reasoning effort: `low`.
- Run contract: `complete_run.harness_canary`.
- Exact eight-cell subset copied from the OPE-19 80-cell schedule.
- Both cohorts and all four routes are represented.
- One repair maximum per cell, 16 provider attempts maximum, and 30 minutes wall time maximum.
- One fresh isolated process per attempt, tools disabled, explicit non-secret environment, and deny-by-default generated effects.
- Generated platform proof: official React Web, Dioxus Web, Direct RSX Web, and Dioxus Desktop.
- Output: `prototype/ecosystem-relative-eval/evidence/ope20-complete-canary-<source-commit>-final`.

The outer canary must also prove that absent real correction, blinded review,
VoiceOver, and TalkBack records keep the nested decision-grade finalizer at
`INVALID_EVAL` without invalidating successful generation evidence.

## One-shot rule and outcomes

The provider-backed command may be started once. There is no silent rerun,
pooling, or replacement run.

- `PASS` promotes only the byte-identical OPE-19 complete-run manifest and unblocks OPE-12.
- `CANARY_INVALID` archives the evidence and keeps OPE-12 blocked.
- OPE-20 never emits an OPE-7 product verdict.

No push, pull request, merge, public publication, or compatibility claim is
authorized.

## Recorded result

Pending. This section is updated only after the one provider-backed invocation
has stopped and its evidence has been independently verified.
