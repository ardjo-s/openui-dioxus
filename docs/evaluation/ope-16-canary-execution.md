# OPE-16 final semantic-pattern canary execution register

Status before execution: `AUTHORIZED_NOT_RUN`

User approval was explicit on 2026-08-26. This register is committed before
the only permitted provider-backed run.

## Frozen candidate

- OPE-15 final local commit: `49da0ab507d8b43809ab2298f42335645c4a4e56`.
- OPE-15 evidence commit: `eada9f1`.
- OPE-15 source commits: `7b76fa3`, `7d50a6f`.
- Candidate manifest SHA-256: `49b71bd46638f1301c59fa345204d12896d0c2175197ec8df4563c2092ad9cf0`.
- OPE-15 evidence: `prototype/ecosystem-relative-eval/evidence/ope15-pattern-contract-7d50a6f-final`.
- OPE-15 `SHA256SUMS` SHA-256: `a23a850a8e77b7a45cb30ed71fb1121bf084e93fdfe604fe13bb5aba1060083d`.
- OPE-15 independent review SHA-256: `1e2547d471f59f4ae53a464ef352efff470dea76dbb88722a7b875d9a2a3b88f`.

The candidate must be recomputed immediately before generation. Any mismatch
ends the run before a provider process starts.

## Provider and isolation

- Provider surface: ChatGPT plan through the installed Codex CLI.
- Model: `gpt-5.6-luna`.
- Reasoning effort: `low`.
- One fresh ephemeral process per attempt.
- Tool surfaces disabled.
- Explicit non-secret environment only.
- Generated code receives no ambient credentials or unrestricted effects.

## One-shot rule

The evaluator may be started once. Each cell may receive at most one registered
repair. The whole run may use at most 16 provider attempts and 30 minutes.
Provider failure, infrastructure failure, manifest drift, incomplete platform
proof, or failed finalization produces `CANARY_INVALID`. It does not authorize a
rerun. OPE-13, OPE-14, and OPE-15 records are never pooled into this result.

## Output and result ownership

The output directory is named `ope16-canary-<source-commit>-final` and must not
exist before execution. The evaluator retains every required raw and derived
artifact and finalizes it with recursive checksums and an independent
recomputation.

The only allowed result is `PASS` or `CANARY_INVALID`. PASS only makes OPE-12
eligible to resume with this byte-identical manifest. OPE-7 alone owns any final
GO or NO-GO product verdict.

No push, PR, merge, public publication, or compatibility claim is authorized.
