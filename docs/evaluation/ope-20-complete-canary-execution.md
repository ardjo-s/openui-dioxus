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

- Final status: `CANARY_INVALID`.
- Source commit before generation: `84e30b4`.
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope20-complete-canary-84e30b4-final`.
- Manifest: `1973db76a604ed0e4378e0fc0e0775be8f29e9cc8ba957599a0c17870bd4a3e3`, byte-identical to OPE-19.
- Provider: `gpt-5.6-luna`, reasoning effort `low`, through the ChatGPT plan.
- Execution: one provider window, 10 attempts, 182.631 seconds, no provider error.
- Final accepted cells: 8/8. OpenUI, typed JSON, and json-render accepted on their first attempts. Both Direct RSX cells passed after their single registered repair.
- Provider usage: 116,311 input tokens, 56,320 cached input tokens, 4,103 output tokens, 1,521 reasoning tokens, and 120,414 total tokens.
- React Web and Direct RSX Web passed with retained screenshots and traces.
- Dioxus Web and Dioxus Desktop failed during linking with `errno=28`, `No space left on device`. Their generated screenshots are correctly absent.
- Platform verification failed, review-packet asset binding could not complete, and operational preflight remained false.
- The nested complete finalizer still proved the required missing-human-evidence block and emitted `INVALID_EVAL`.
- Credential findings: zero.
- `SHA256SUMS` SHA-256: `335008e3f9bac2c15ffd0ad2d1a3967313ed98a6ab00cb4a31f463744c703363`.
- Independent review SHA-256: `c3f4bf5f16008f257c60caf6d21102cd3a9c24192afb2696471124446fc8f5c9`.
- Independent findings: `platform-evidence-invalid` and `review-packet-count-mismatch`.

The wrapper first encountered a local `ENOSPC` during pre-provider tests. That
attempt created no runner artifact and made zero provider calls. After only
regenerable caches were removed, all 63 tests, typecheck, the Dioxus contract,
and shell checks passed. This was recorded in Linear before the single provider
window began.

The official provider window is not rerun. OPE-12 remains blocked, and OPE-7
emits no product verdict from this invalid canary.

## Post-run harness findings

The two-pass review found two blocking harness defects:

1. The pre-provider gate had no minimum-free-space requirement. Generation
   consumed the only provider window before the later Dioxus link exposed the
   remaining-space failure.
2. Dioxus Web created an untracked root `target/` inside the implementation tree
   hashed by the candidate manifest. Removing only that generated directory
   restored the exact frozen manifest hash
   `1973db76a604ed0e4378e0fc0e0775be8f29e9cc8ba957599a0c17870bd4a3e3`,
   but the target-path isolation defect remains in the frozen harness.

These findings do not change the official archive or result. They require a
new deterministic hardening ticket and a separately approved recovery canary.
