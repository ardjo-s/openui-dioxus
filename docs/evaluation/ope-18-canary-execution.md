# OPE-18 rendered receipt canary execution register

User approval explicitly authorizes one new provider-backed canary after the
deterministic OPE-17 gate passed. This register is committed before that run.

## Frozen candidate

- OPE-17 final commit: `9ddf28e`.
- OPE-17 source commit: `7cf7378`.
- OPE-17 evidence commit: `1c7ea19`.
- Candidate manifest SHA-256: `9623a1457dee64555a2595cd878ddf7a7d13187747206a0ad7c1554b1208190e`.
- Candidate manifest: `prototype/ecosystem-relative-eval/evidence/ope17-rendered-receipt-preflight-final/candidate-manifest.json`.
- OPE-17 `SHA256SUMS` SHA-256: `85ad25096c6031eb00a49763a1bb3678334d48c1392324b9a22fbfde939040e3`.
- OPE-17 independent review SHA-256: `319d2313f552a0cec17e5f220c28999c4d10c286e6459dfa61273fc72177b833`.

The manifest was recomputed in the isolated OPE-18 worktree and matched before
this register was committed. Any later mismatch stops before generation.

## Frozen execution

- Provider: ChatGPT plan through the installed Codex CLI.
- Model: `gpt-5.6-luna`.
- Reasoning effort: `low`.
- One fresh isolated process per attempt with tools disabled.
- Same eight-cell schedule, route order, scenarios, prompts, catalogs, one-repair ceiling, 16-call ceiling, 30-minute ceiling, trust controls, platform targets, evidence schema, and thresholds as the candidate manifest.
- Output: `prototype/ecosystem-relative-eval/evidence/ope18-canary-<source-commit>-final`.

## One-shot and outcomes

The provider-backed command may be started once. There is no silent rerun and
no pooling with OPE-16 or any deterministic preflight.

- `PASS` promotes only the byte-identical manifest and reopens OPE-12.
- `CANARY_INVALID` archives the evidence and keeps OPE-12 canceled.
- OPE-18 never emits the OPE-7 product verdict.

No push, pull request, merge, public publication, or compatibility claim is
authorized.
