# Ecosystem-relative product-value evaluation decisions

Status: resolved for OPE-9

Research basis: [current primary-source review](../research/ecosystem-relative-product-value-evaluation-2026-08-25.md)

These decisions design the evaluation. They do not execute a model benchmark, implement a runtime, or emit a product verdict. Decisions 09 and 10 remain open.

## Decision tree

### Round 1 — What is being measured?

#### D1 — Keep four independent questions

The evaluation has four scorecards and no blended ecosystem score:

1. protocol promptability;
2. constrained-runtime value;
3. design-system onboarding and maintenance;
4. cross-platform leverage.

A result from one scorecard cannot stand in for another. In particular, generation validity cannot establish replay value, and a shared Dioxus codebase cannot establish OpenUI prompt value.

#### D2 — Give every baseline its strongest fair scope

| Route | Role | Scope in which it is strongest |
| --- | --- | --- |
| OpenUI Dioxus | Candidate product route | Runtime-uncertain workflows requiring constrained data, typed actions, revisions, receipts, and replay |
| Typed JSON Dioxus | Primary product baseline | The same runtime-uncertain workflows through the same catalog and canonical runtime boundary |
| A2UI Dioxus | Frozen protocol context | The OPE-3 pairwise promptability result only |
| Direct Dioxus/RSX | Compile-known baseline | Interfaces whose structure, actions, and catalog bindings are known when the application is compiled |
| `json-render` React/TypeScript | External dynamic-UI baseline | Runtime-generated catalog-constrained Web UI through its native catalog, state, action, streaming, and MCP surfaces |

The evaluation must not force direct RSX through a Surface interpreter or force `json-render` through the Dioxus canonical Surface. Each route uses its native highest honest seam, then meets at frozen user-observable behavior: accepted content, state transitions, typed or registered actions, visible results, error prevention, and declared target coverage.

#### D3 — Import the A2UI result; do not rerun it

OPE-3 remains immutable protocol evidence. A2UI is rerun only in a new ticket after a material, preregistered protocol question such as a version, prompt, validator, or catalog-semantics change. It is not extended into the product, maintenance, or platform cohorts by implication.

### Round 2 — Which workflows and evidence are fair?

#### D4 — Use separate runtime-uncertain and compile-known cohorts

The runtime-uncertain cohort retains the OPE-5 shape: five MCP workflow families with four deterministic variants, for 20 frozen scenarios. OpenUI and typed JSON remain paired at the shared canonical runtime seam. `json-render` receives byte-identical intent, MCP schemas and results, catalog semantics, state, action, update, and acceptance contracts, but uses its official React/TypeScript runtime and renderer. Representation-specific instructions are sufficient, minimal, hashed, and fully charged.

The compile-known cohort uses one frozen representative from each workflow family. Direct RSX, OpenUI, typed JSON, and `json-render` receive the same complete UI and behavior specification. Direct RSX generation may emit ordinary reviewed application code and use the shared typed host client, but it is not required to implement a Surface, generic catalog interpreter, or replay unless the scenario itself requires those properties. Generated code remains untrusted until it compiles and passes tests in isolation.

Direct RSX is expected to win simple compile-known work. The constrained runtime earns scope only when runtime uncertainty, replay, migration, or auditable effect mediation offsets its measured cost.

#### D5 — Measure a second real catalog, not the existing thin swap

Dioxus Components remains the 12-component primary catalog. Rust/UI at pinned snapshot `7fd792520ba5e3ad5354c26ac4e6816c2d156b7c` is the second catalog. Its evaluation slice must include at least eight components spanning six certified capability families, two complete workflows, one typed action, and one accessibility-sensitive control.

The thin catalog swap remains seam evidence. It cannot satisfy onboarding or maintenance-cost gates.

### Round 3 — How often and how decisively does the evaluation run?

#### D6 — Fast canary: operational, never decisional

Run the canary after any provider, prompt, schema, catalog, adapter, scorer, or platform-driver change and immediately before a complete run.

Before any canary provider call, freeze and hash a candidate decision manifest containing every source pin, prompt, catalog, scenario, order, reviewer rule, rate, threshold, and evidence schema. The canary contains two runtime-uncertain and two compile-known workflows, at most 16 provider calls including one repair per attempted route, deterministic second-catalog and migration fixtures, one Web interaction per runtime route, one Dioxus Desktop launch, and one React Web interaction.

It passes only when preregistration hashes match, every attempted output is accepted after at most one repair, equivalent outputs satisfy the frozen observable contract, runtime behavior diff is zero for catalog-only work, replay stays inert, evidence is complete, the secret scan is clean, and wall time is at most 30 minutes. A passing canary promotes that exact unchanged manifest into the complete run. Any input or methodology change creates a new manifest and requires a new canary. A timeout or infrastructure failure is `CANARY_INVALID`, not evidence against a product route. A canary can block the complete run but can never emit `GO`, `PIVOT`, or `NO_GO`.

#### D7 — Complete cadence: freeze evidence, then decide in OPE-7

The complete decision cadence has two locked phases. First, a separate ecosystem ticket produces the complete anonymous evidence set after the canary passes, OPE-6 has valid four-platform evidence, all source pins and rates are frozen, and no implementation input changes. Second, OPE-7 performs the blinded reviews, independent recomputation, and final scorer over that frozen set. Rerun only after an invalid evaluation or a newly preregistered material change; never average runs across different pins.

The complete run includes:

- all 20 runtime-uncertain scenarios for OpenUI, typed JSON, and `json-render`;
- the five compile-known representatives for direct RSX, OpenUI, typed JSON, and `json-render`;
- one repair maximum per route and attempt;
- both real catalogs and all change drills;
- anonymized UI review packets, accessibility and Web/Desktop/Mobile evidence at each route's declared support scope, replay and migration checks, hashes, and a credential scan;
- OPE-7 blinded UI and maintenance review, independent recomputation, and final product outcome without regenerating provider artifacts.

Before promotion, an independent applicability table classifies every scenario requirement as shared, Dioxus-specific, React-supported, or route-specific. Pairwise ranking uses only the compared routes' shared requirements. Direct RSX executes the same applicable Web, Desktop, iOS, and Android matrix as the compile-known Dioxus Surface routes; behavior shared by both is credited to Dioxus, not to the constrained runtime.

### Round 4 — What are the gates?

#### D8 — Integrity and correctness are hard gates

Any missing scenario, unverified preregistration, unpinned source, provider contamination, missing invalid attempt, evidence-hash failure, credential leak, unrecorded human correction, or missing required platform artifact produces `INVALID_EVAL`.

Any hidden effect, non-inert replay, unauthorized action, state/update divergence, critical or serious accessibility defect, undeclared fallback, runtime behavior change for a catalog-only drill, or failed required Dioxus target produces `NO_GO` for the affected architecture claim.

#### D9 — Preserve the OPE-5 primary product thresholds

Against typed JSON, OpenUI must satisfy all of these hard non-inferiority gates:

- at least 19 of 20 runtime-uncertain scenarios valid after one repair;
- no more than one scenario behind typed JSON on first-pass or post-repair validity;
- blinded quality mean no more than 0.5 points below typed JSON on a five-point scale;
- maintenance lines and total measured cost each no more than 1.25 times typed JSON;
- zero canonical runtime behavior lines changed by representation or catalog adapters.

A material OpenUI advantage remains at least one of:

- 20% lower median cumulative raw tokens;
- 10 percentage points higher first-pass validity;
- 25% lower median active human correction time.

OPE-7 remains the sole owner of the primary outcome: `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or `INVALID_EVAL`. `GO_OPENUI_DIOXUS` requires every hard gate plus one material OpenUI advantage. Passing the runtime architecture without an OpenUI material advantage yields `PIVOT_TO_SURFACE_RUNTIME`. The preceding ecosystem evidence ticket cannot serialize or publish one of these outcomes.

#### D10 — Add ecosystem scope without pooling scores

`json-render` and direct RSX produce separate pairwise and scope conclusions:

- OpenUI may not claim ecosystem-relative value if `json-render` is better on UI quality, correction time, and maintenance cost while matching every required runtime guarantee and declared target.
- A route that lacks exact replay, migration, typed effect receipts, Desktop, or Mobile is recorded as unsupported for that requirement; the evaluation must not build custom substitute infrastructure that improves the baseline after preregistration.
- Direct RSX is the recommended route for a compile-known workflow unless the constrained route reduces median change cost by at least 25% or the workflow requires a runtime-only guarantee such as constrained unknown structure, inert replay, exact migration, or auditable effect mediation.
- Dioxus cross-platform leverage is credited only for executed equivalent behavior, not shared source files or compilation alone.

These conclusions explain where to use each route. They do not alter the primary OpenUI-versus-typed-JSON scorer.

OPE-7 applies the following vetoes after the primary scorer, without averaging scores:

| Ecosystem condition | Final-outcome effect |
| --- | --- |
| `json-render` matches every shared required runtime guarantee and target while beating OpenUI on UI quality, correction time, and maintenance cost | `NO_GO` because the external ecosystem route dominates the proposed product scope |
| The constrained Surface runtime passes every architecture gate but OpenUI has no material advantage over typed JSON | `PIVOT_TO_SURFACE_RUNTIME` |
| Second-catalog onboarding changes canonical runtime behavior, violates effect or replay boundaries, or misses its hard catalog gates | `NO_GO` |
| Direct RSX wins the compile-known cohort without a runtime-only requirement | Exclude compile-known workflows from the OpenUI-Dioxus product scope; this alone is not a global veto |
| A claimed cross-platform advantage is reproduced by direct RSX | Credit Dioxus only; do not count it as an OpenUI material advantage |

`GO_OPENUI_DIOXUS` therefore requires the primary hard gates, one primary material advantage, and no ecosystem veto.

#### D11 — Define every requested measurement

| Measurement | Required evidence and threshold |
| --- | --- |
| Validity and repair | First-pass and post-repair counts; one repair maximum; every rejected attempt retained and charged |
| Human correction | At least two route-qualified correctors in a blocked crossover with identical practice tasks, balanced route order, fixed clock rules, and operator-level results; active timer excludes queue/build wait; OpenUI hard cost ratio at most 1.25 versus typed JSON |
| Blind UI quality | Randomized outputs with arm labels and route metadata removed; at least three reviewers covering product design, frontend maintenance, and accessibility; anchored 1–5 rubrics; ordinal Krippendorff alpha at least 0.67; post-score route guesses tested against chance |
| Accessibility | Zero critical or serious automated findings; all frozen name/role/state/focus/error assertions; manual keyboard and representative VoiceOver/TalkBack checks |
| Second catalog | At least 8 Rust/UI components, 6 families, 2 workflows; zero runtime behavior LOC; at most 16 active onboarding hours |
| Change drills | Component prop, schema/component addition, action-policy change, DTCG token change, catalog release change, and one migration; every drill independently reproducible |
| Replay and migration | 100% semantic fingerprint equality for supported artifacts; no model, network, tool, navigation, or host effect; copy-on-write source preservation |
| Platforms | All accepted Dioxus Surfaces on Web and Desktop; one representative per family on iOS and Android; direct RSX representatives on the same applicable Dioxus matrix; React routes only on officially implemented targets, reported without inferred parity |
| LOC and files | Handwritten, generated, test, catalog, adapter, runtime, platform, and baseline code reported separately from version-control numstat |
| Total cost | Two frozen views: first-adoption cost over both catalogs, 25 workflows, all drills, and all claimed targets feeds the hard gate; steady-state cost over the same workflows and one change cycle excludes initial onboarding and is reported as sensitivity; no missing or estimated-as-zero field |

If reviewer agreement is below 0.67, the UI review is invalid and must be repeated with fresh reviewers over unchanged packets. If route guesses are significantly above the route-balanced chance rate, the affected comparison is marked `UNBLINDED` and cannot satisfy the GO quality gate; scores remain descriptive.

All provider fixtures are synthetic and non-sensitive. Secret and sensitive-data scans run before every provider call and again before publication. Evaluation credentials are least-privilege and never enter prompts or evidence. Raw evidence has a preregistered access and retention policy. Generated artifacts remain untrusted after validation or compilation: every live route uses allowlisted catalogs and actions, bounded inputs and resources, and deny-by-default effect mediation.

### Round 5 — Where does the React baseline belong?

#### D12 — Keep React/TypeScript out of OPE-7 implementation scope

The `json-render` baseline belongs in a separate implementation ticket because it has a different runtime, renderer, package ecosystem, platform surface, evidence seam, and rollback path. Folding it into OPE-7 would invalidate the already frozen OpenUI-versus-typed-JSON plan and create one oversized PR.

The separate decision-grade ecosystem evidence ticket blocks OPE-7. OPE-7 remains `Todo` while OPE-6 blocks it, retains its existing OpenUI-versus-typed-JSON scorer, and consumes the external baseline as a separate report section. Its description may receive only an explicit amendment naming that dependency, reserving the final outcome to OPE-7, and forbidding pooled scores; its implementation does not absorb the React harness.

## Required implementation slices

1. [OPE-10](https://linear.app/ardjo/issue/OPE-10/onboard-rustui-as-the-measured-second-dioxus-catalog) onboards and measures the real Rust/UI second catalog. It is blocked by OPE-9.
2. [OPE-11](https://linear.app/ardjo/issue/OPE-11/build-the-ecosystem-relative-evaluation-harness-and-canary) builds the ecosystem-relative harness and passes the non-decision canary. It is blocked by OPE-6 and OPE-10.
3. [OPE-12](https://linear.app/ardjo/issue/OPE-12/produce-the-decision-grade-ecosystem-evidence-set) produces and independently validates the complete decision-grade evidence set. It is blocked by OPE-11 and blocks OPE-7 until its immutable report and anonymized review packets exist.

No additional implementation ticket is justified by the current design.
