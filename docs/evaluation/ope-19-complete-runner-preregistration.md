# OPE-19 complete decision-grade runner preregistration

OPE-19 freezes and preflights the complete OPE-12 runner. It performs no
external provider call and emits no product verdict.

## Frozen predecessor

- OPE-18 source commit: `a3f895f`.
- OPE-18 evidence commit: `6681f02`.
- OPE-18 outcome: `PASS`.
- OPE-18 evidence directory: `prototype/ecosystem-relative-eval/evidence/ope18-canary-a3f895f-final`.
- Candidate manifest SHA-256: `9623a1457dee64555a2595cd878ddf7a7d13187747206a0ad7c1554b1208190e`.
- `SHA256SUMS` SHA-256: `9c0a378af9203cea0f2769dae84255900397aeed280c5f18f2f4e22900ffa098`.
- Independent review SHA-256: `ebcfe05d6e9b67b8f1f61f04cd7f20cb56cf794577d78bcd475b8bf3ce9e0dbd`.

OPE-13 through OPE-18 evidence remains immutable and excluded from every new
aggregate.

## Complete schedule

The runner executes exactly 80 route cells in strict manifest order:

1. Twenty runtime-uncertain scenarios across OpenUI, typed JSON, and official
   json-render, for 60 cells.
2. Five compile-known representatives across OpenUI, typed JSON, official
   json-render, and Direct RSX, for 20 cells.

Each scenario and route pair appears once. Route order rotates by scenario so
that each route receives balanced positions. Every attempt is retained. One
repair is allowed, for at most 160 provider calls and four hours wall time.

## Isolation and execution

The OPE-19 preflight uses the deterministic fake provider and makes zero
external calls. A real attempt uses one fresh tool-disabled Luna-low process,
receives no ambient credentials, and must cross the same validators. Structured
outputs are treated as data. Direct RSX is compiled and executed only in the
registered deny-network sandbox.

The complete platform scope is React Web for json-render, Dioxus Web, Dioxus
Desktop, Direct RSX Web and Desktop, iOS, and Android. VoiceOver on iOS and
TalkBack on Android require explicit manual evidence. A build or launch marker
does not substitute for rendered and exercised behavior.

The machine runner retains every accepted OpenUI and typed-JSON Surface on Web
and Desktop, every json-render artifact on its official Web target, and every
compile-known Direct RSX artifact on Web. Desktop launches each registered
Surface separately and captures one validated screenshot per Surface. iOS,
Android, VoiceOver, and TalkBack remain explicit human collection stages and
cannot be inferred from builds or desktop evidence.

## Human evidence contract

Completion requires all eleven registered classes:

1. Corrections from exactly two practiced operators, with a frozen disjoint
   assignment covering all 80 cells exactly once and every operator, route,
   scenario, active duration, correction result, and artifact retained.
2. Blind reviews from exactly three eligible reviewers, with six 1-to-5 scores
   per packet and a route guess recorded only after scoring.
3. Manual keyboard evidence on Web and Desktop.
4. VoiceOver evidence on iOS.
5. TalkBack evidence on Android.
6. Rendered and exercised iOS and Android evidence.
7. Replay evidence.
8. Migration evidence.
9. All five change drills.
10. Measured first-adoption and steady-state costs.
11. Requirement applicability evidence.

Missing, estimated, duplicated, conflicted, unblinded, malformed, failed, or
unhashed records invalidate the evaluation. Every human `artifact_sha256` must
resolve to a retained file in the private content-addressed human-assets
archive. Synthetic complete fixtures may test the schema but cannot replace the
real collection stage because decision-grade finalization requires that exact
asset inventory.

## Blinded review packets

Packets are deterministically ordered from the registered seed commitment.
They contain only a neutral task contract, content-addressed screenshots, and a
behavior recording reference. The packet builder rejects route names, route
syntax, filesystem paths, generation metrics, and technology brands. Each
packet has a content hash and is immutable after the first opening record.
Generated-output runs bind every packet screenshot to the actual Web or Desktop
PNG hash. Deterministic reference preflights may use explicit placeholders, but
those packets cannot become decision-grade review evidence.

## Two-stage archive

Generation happens once. It writes immutable attempts, platform evidence,
review packets, checksums, and a candidate marker that waits for human evidence.
The human collection then runs outside the provider window. A separate local
finalizer validates every packet opening and evidence record, adds them to a new
checksum chain, and writes `COMPLETE_EVIDENCE.json`. It never starts a provider
process and never changes a byte from the generation archive.

## OPE-20 harness canary

The exact OPE-19 manifest also freezes an eight-cell subset copied from the
80-cell schedule. It spans both cohorts and all four routes, uses the same
prompts and one-repair policy, generates real Web and Desktop evidence, and
proves that absent correction, review, VoiceOver, and TalkBack records keep the
nested complete finalizer invalid. OPE-20 may promote only this byte-identical
manifest after one Luna-low execution.

## Outcomes

The complete runner may emit only:

- `READY_FOR_REVIEW`, when generation, platform, human, and assistive-technology
  evidence is complete and valid.
- `INVALID_EVAL`, for every incomplete or invalid run.

`GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, and `NO_GO` are forbidden here.
Only OPE-7 may produce one of those product verdicts after OPE-12 evidence and
the independent review and maintenance drills are complete.
