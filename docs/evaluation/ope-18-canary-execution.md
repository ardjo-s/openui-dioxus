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

## Recorded result

- Final status: `PASS`.
- Source commit before generation: `a3f895f`.
- Evidence: `prototype/ecosystem-relative-eval/evidence/ope18-canary-a3f895f-final`.
- Manifest: `9623a1457dee64555a2595cd878ddf7a7d13187747206a0ad7c1554b1208190e`, byte-identical to OPE-17.
- Execution: one canary invocation, nine provider attempts, 144.680 seconds, no provider error.
- Final accepted cells: 8/8. OpenUI, typed JSON, json-render, and Direct RSX each accepted both cells. Direct RSX used one registered repair.
- Provider usage: 105,655 input tokens, 71,424 cached input tokens, 3,691 output tokens, 1,593 reasoning tokens, and 109,346 total tokens.
- Real platform proof: React Web, Dioxus Web, Direct RSX Web, and Dioxus Desktop all passed.
- Canonical runtime behavior diff: zero lines.
- Credential findings: zero.
- `SHA256SUMS` SHA-256: `9c0a378af9203cea0f2769dae84255900397aeed280c5f18f2f4e22900ffa098`.
- Independent review SHA-256: `ebcfe05d6e9b67b8f1f61f04cd7f20cb56cf794577d78bcd475b8bf3ce9e0dbd`.

This PASS makes OPE-12 eligible to reopen. It is not an OPE-7 GO or NO-GO
product verdict.
