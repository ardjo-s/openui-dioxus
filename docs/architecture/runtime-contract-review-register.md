# Runtime contract decision-review register

Status: active for `v0.1`

Normative contract: [ticket 06](../../.scratch/openui-dioxus/issues/06-define-runtime-domain-contract.md)

This register says when the runtime decisions should be questioned during implementation. It does not duplicate or override their normative wording. A trigger opens a review; it does not change the decision automatically.

## Reopening protocol

Reopen a decision only when its recorded trigger is observed:

1. Capture evidence from a representative conformance test, prototype scenario, usability session, incident, or production metric.
2. Recheck the pinned OpenUI and Dioxus sources; distinguish an upstream change from a project implementation defect.
3. Create a focused tracker issue linking the affected decision, evidence, compatibility impact, replay impact, migration need, and rollback plan.
4. Keep the current rule in force until the replacement passes its stated proof and the normative contract is updated.

Do not reopen a decision merely because a less constrained implementation looks easier.

## Adapter clarification

`CatalogAdapter` and `PlatformHost` are versioned extension seams around the existing contract, not alternate runtimes. The separate `Application host` owns external effects. These seams do not reopen Q1–Q21:

- `CatalogAdapter` implements an exact trusted catalog release through statically compiled Dioxus views and typed events. `v0.1` defines a Rust source/API contract, not dynamic loading or a stable Rust ABI.
- `PlatformHost` may provide bounded local UI mechanisms to the renderer. Every host-visible effect still follows Q2 through an Effect invocation, policy decision, `Application host`, and receipt.
- Q21 support negotiation includes `catalog_contract_version`, schema and release hashes, `adapter_build_id`, the `static_rust_v1` execution profile, Dioxus version and target, and the exact `PlatformHost` capability profile. “Direct” means reviewed compile-time integration, not automatic execution of arbitrary framework code.
- A future binary profile may be considered only under the Q3 reopening trigger. It requires a separate decision and must not retroactively claim binary compatibility for static catalog releases.

## Stability classes

- **Core invariant** — protects meaning, user intent, data, or replay. Change only with stronger proof and an explicit compatibility plan.
- **`v0.1` guardrail** — deliberately conservative. Revisit after the prototype exposes measured cost or missing capability.
- **Tunable policy** — the boundary remains fixed, but a threshold or retention value may change from evidence.
- **Deferred seam** — define the boundary now; implement only when the first real case exists.

## Decision register

| ID | Current rule, shortened | Stability | Reopen when |
| --- | --- | --- | --- |
| Q1 | Keep immutable OpenUI program history separate from executable Surface revisions. | Core invariant | Upstream provides a durable canonical patch object, and differential tests prove a simpler model preserves patch, rendering, and replay semantics without a second authority. |
| Q2 | Every host-visible effect crosses the runtime-to-host boundary; catalog adapters remain pure views. | Core invariant | A new effect class is discovered. Extend the boundary; never bypass it for convenience. |
| Q3 | Use exact, trusted, compiled catalog releases in `v0.1`. | `v0.1` guardrail | Real adopters require runtime-loaded third-party components and a prototype proves signature verification, isolation, resource control, deterministic identity, and failure containment. |
| Q4 | Preserve immutable structural revision identity and ancestry; compact only unreferenced bodies or deltas. | Tunable policy | Representative replay archives show unacceptable storage or load cost. Identity, parent, hash, phase, and event references remain non-removable. |
| Q5 | Stream only whole, dependency-closed, valid, inert named-statement subtrees. | `v0.1` guardrail | Statement granularity prevents useful progressive display and a tested dependency graph can prove smaller subtrees closed and inert across chunk permutations. |
| Q6 | Keep durable `InstanceId` separate from Dioxus reconciliation keys. | Core invariant | OpenUI introduces an official rendered-instance identity or Dioxus changes its reconciliation contract; conformance and reorder tests must then be rerun. |
| Q7 | Scope state by session, Surface, and exact `$name`; support Set and Reset, not invented per-key deletion. | `v0.1` guardrail | OpenUI standardizes deletion or representative workflows cannot model lifecycle with Reset and session teardown. Any addition needs explicit migration and replay semantics. |
| Q8 | Disable generated interaction while an update is streaming. | `v0.1` guardrail | The latency or behavior trigger in the Q8 experiment below fires after basic generation optimization. |
| Q9 | Atomically compare and claim witnessed user intent before dispatch. | Core invariant | A replacement concurrency model formally preserves the exact witnessed target, values, plan, and policy under racing revisions. |
| Q10 | Prepare and receipt every external action-plan step separately; never retry `unknown` automatically. | Core invariant | OpenUI changes action-plan semantics or host idempotency contracts. Multi-effect ambiguity must remain visible rather than being collapsed. |
| Q11 | Reject or quarantine a broken update as one whole-program operation. | `v0.1` guardrail | A dependency graph plus differential corpus proves partial commit produces the same valid program semantics as upstream whole-program patch merge. |
| Q12 | Keep non-demotable blocking floors and stable diagnostic fingerprints. | Core invariant | Upstream standardizes diagnostic identities or evidence shows the fingerprint is unstable. Lowering a blocking floor requires a versioned compatibility decision, not a local setting. |
| Q13 | Migrate between complete compatibility vectors and preserve the source artifact. | Deferred seam | The first real contract version changes. Build only the required source-to-target edge and fixtures; do not add speculative migrations. |
| Q14 | Separate stabilization from checkpoints; call replay `full` only when every behavior-affecting dependency exists. | Core invariant | Real archive, privacy, or export scenarios expose a missing fidelity category. Missing dependencies must remain explicit. |
| Q15 | Keep correction outside the runtime with at most two attempts by default. | Tunable policy | The evaluation corpus measures repair success, repeated fingerprints, latency, and cost. Tune the attempt budget without moving model calls into the runtime. |
| Q16 | Replay stored semantics through an inert renderer; live reconnection is a different execution. | Core invariant | Platform tests require a clearer semantic-equivalence definition. Network, tools, navigation, models, and host effects remain forbidden during replay. |
| Q17 | Apply patches to OpenUI program history and atomically commit Program and Surface revisions together. | Core invariant | Upstream patch semantics change and differential tests prove a replacement preserves whole-program behavior and atomicity. |
| Q18 | Order all semantic facts through one monotonic per-Surface sequencer in `v0.1`. | `v0.1` guardrail | A real multi-writer requirement or measured sequencer bottleneck appears. Any replacement must still produce one deterministic replay order. |
| Q19 | Classify transient input before any persistent log, receipt, checkpoint, or export. | Core invariant | Classification taxonomy or retention rules change. The classify-before-write boundary and technical-secret exclusion are never relaxed. |
| Q20 | Coalesce state only across spans with no observation barrier. | Tunable policy | Archive size or event latency becomes material and replay differential tests prove the proposed removed events were unobservable. |
| Q21 | Decide support from a complete behavior-affecting compatibility vector. | Core invariant | OpenUI or Dioxus publishes a stronger standard negotiation contract. Add newly discovered behavior-affecting axes immediately; never infer support from one version number. |

## Q8 experiment: interaction during streaming

### Why this decision may change

Rust validation and Dioxus rendering should be fast. The blocked period mainly comes from model generation, output size, external tool or data waits, network conditions, and correction rounds. A large or repaired interface can therefore be visible but non-interactive long enough to frustrate a user.

### Instrumentation

Record these events separately for each representative scenario and target platform:

- `first_provisional_visible_at`: first valid provisional subtree appears.
- `surface_committed_at`: final validated Surface may accept generated interaction.
- `blocked_interaction_window_ms`: difference between the two timestamps.
- `disabled_control_attempt_count`: attempts to use generated controls before commit.
- `stream_abandoned`: user cancels or leaves before commit.
- `correction_round_count`: separates slow generation from validation repair.
- Tool and network wait time: recorded separately so renderer latency is not blamed for external work.

### Reopening trigger

Reopen Q8 when either condition occurs after basic prompt, model, payload-size, and streaming optimization:

- `p95(blocked_interaction_window_ms) > 3000` on the representative prototype corpus; or
- usability testing repeatedly shows attempts to use disabled controls or abandonment before commit.

The three-second value is a project review threshold, not a universal UX law. Crossing it starts an experiment; it does not enable interaction automatically.

### Proof required before loosening Q8

A future negotiated `stream_local_interaction = true` capability must prove all of the following:

- only reversible local Set or Reset behavior is enabled; external effects, navigation, resources, queries, and mutations remain blocked until commit;
- the provisional revision, `InstanceId`, and state address are stable enough to bind every event without guessing;
- each local change enters the semantic event sequence and replays deterministically across streaming chunk permutations;
- rejection of the update has explicit input transfer or rollback behavior and never silently loses or retargets user input;
- accessibility clearly communicates provisional, disabled, enabled, rejected, and committed states;
- desktop, web, Android, and iOS tests produce equivalent semantics.

Early external reads remain a separate host capability and cannot be smuggled into streamed local interaction.
