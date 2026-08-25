# Ecosystem-relative product-value evaluation specification

Status: implementation-ready design

Normative decisions: [ecosystem-relative evaluation decisions](ecosystem-relative-product-value-decisions.md)

Research basis: [primary-source review](../research/ecosystem-relative-product-value-evaluation-2026-08-25.md)

## Problem Statement

The project knows that OpenUI beat the frozen A2UI protocol arm and tied strict typed JSON in a small controlled generation benchmark. It does not yet know whether an OpenUI-Dioxus product creates enough value to justify a constrained runtime when typed JSON, direct Dioxus/RSX, and a mature React/TypeScript dynamic-UI ecosystem are available.

A fair answer cannot come from one ranking. Protocol promptability, runtime guarantees, design-system maintenance, and cross-platform reuse have different baselines and evidence seams. Comparing all routes on the same inappropriate workload would favor the constrained runtime on compile-known UI or erase its value on runtime-uncertain UI. The project needs one preregistered evaluation that preserves those boundaries, measures total cost, and produces evidence OPE-7 can consume without silently changing its existing scorer.

## Solution

Build an ecosystem-relative evaluation in three independently reviewable slices: a real second-catalog onboarding proof, an evaluation harness with a fast non-decision canary, and one immutable decision-grade run.

The evaluation imports the frozen OPE-3 A2UI result. It keeps typed JSON Dioxus as the primary product baseline. It compares OpenUI, typed JSON, and the official `json-render` React/TypeScript route on runtime-uncertain MCP workflows while preserving each route's native runtime. It also tests direct Dioxus/RSX on compile-known workflows where ordinary application code is strongest. A shared observable contract covers user-visible content, state, actions, feedback, and declared target behavior without forcing every route through the Dioxus Surface.

The canary detects drift quickly and can block the complete evidence run, but it cannot issue a verdict. The evidence run freezes source pins, prompts, catalogs, scenarios, order, reviewers, rates, thresholds, and evidence manifests before any provider call. It publishes anonymized packets and four separate scorecards. OPE-7 alone performs the blinded review, independently recomputes the evidence, and applies the existing OpenUI-versus-typed-JSON product scorer without pooling A2UI, React, direct RSX, maintenance, or platform scores.

## User Stories

1. As the project owner, I want typed JSON Dioxus to remain the primary product baseline, so that OpenUI must beat the simplest credible constrained representation.
2. As the project owner, I want A2UI kept as frozen protocol context, so that a narrow pairwise result is not promoted into product evidence.
3. As the project owner, I want four separate scorecards, so that promptability, runtime value, catalog maintenance, and cross-platform leverage cannot conceal one another.
4. As a Dioxus developer, I want direct RSX tested on compile-known UI, so that ordinary typed application code is not penalized for lacking an unnecessary runtime protocol.
5. As a React developer, I want an official mature dynamic-UI baseline, so that OpenUI is not compared with a toy React renderer.
6. As a React baseline reviewer, I want `json-render` to use its native catalog, state, action, streaming, and renderer APIs, so that Dioxus normalization does not erase its strengths.
7. As a runtime evaluator, I want runtime-uncertain workflows to include unknown structure, data, actions, or revisions, so that the constrained runtime is tested only where it may add value.
8. As an evaluator, I want compile-known and runtime-uncertain cohorts frozen separately, so that conclusions remain scoped.
9. As an evaluator, I want byte-identical shared intent, MCP schemas, MCP results, catalog semantics, state, actions, updates, and acceptance rules wherever routes are pairwise comparable.
10. As an evaluator, I want route-specific syntax guidance to be sufficient, minimal, hashed, and charged, so that documentation cost is not hidden.
11. As an auditor, I want every generated representation or code artifact treated as inert and untrusted until its route-specific validator or compiler accepts it.
12. As an auditor, I want rejected attempts retained, so that failures cannot improve tokens, latency, correction, or cost results.
13. As an evaluator, I want one repair maximum, so that recovery remains bounded and comparable.
14. As an evaluator, I want fresh isolated provider sessions and balanced order, so that one route cannot teach or systematically delay another.
15. As a maintainer, I want a real Rust/UI second catalog, so that the existing thin swap is not misreported as onboarding evidence.
16. As a design-system maintainer, I want component semantics, usage rules, events, accessibility, generated artifacts, and adapter work timed separately, so that catalog cost is inspectable.
17. As a design-system maintainer, I want component-prop, component/schema, action-policy, token, catalog-release, and migration drills, so that ordinary evolution is measured rather than inferred.
18. As a runtime maintainer, I want catalog-only changes to produce zero canonical runtime behavior changes, so that the extension seam is falsifiable.
19. As a replay reviewer, I want old artifacts either supported at their exact compatibility vector or migrated copy-on-write, so that upgrades never rewrite history silently.
20. As a security reviewer, I want replay to remain unable to call a model, network, tool, navigation handler, or host effect, so that replay evidence proves physical inertness.
21. As a user, I want UI quality reviewed without arm labels or route metadata, so that reviewers score the interface rather than its disclosed technology.
22. As a product reviewer, I want completeness, usefulness, hierarchy, error prevention, and feedback scored separately, so that a visually polished but unsafe UI cannot win.
23. As an accessibility reviewer, I want automated findings and manual keyboard, VoiceOver, and TalkBack evidence, so that HTML attributes are not mistaken for usable accessibility.
24. As a Web user, I want every accepted Dioxus Surface interaction-tested in the pinned Web target, so that compilation is not called execution.
25. As a Desktop user, I want every accepted Dioxus Surface launched and observed in the pinned Desktop target, so that a surviving process is not called rendered behavior.
26. As a Mobile user, I want one representative per workflow family exercised on iOS and Android, so that shared code is not called mobile equivalence.
27. As a React reviewer, I want only officially implemented `json-render` targets reported, so that missing Desktop or Mobile coverage is visible rather than filled with custom post hoc infrastructure.
28. As an engineering manager, I want handwritten, generated, test, catalog, adapter, runtime, platform, and baseline LOC and files separated, so that code-generation volume is not confused with maintenance burden.
29. As a product owner, I want provider, compute, human, correction, catalog, drill, and platform costs included, so that a cheap generation route cannot hide expensive ownership.
30. As a developer, I want a canary that completes in at most 30 minutes, so that harness drift is caught before an expensive complete run.
31. As a decision maker, I want the canary forbidden from producing a product verdict, so that four scenarios cannot overrule the preregistered sample.
32. As an auditor, I want the complete run executed only from frozen inputs after a passing canary, so that methodology cannot change in response to outputs.
33. As an auditor, I want independent recomputation, recursive checksums, and credential scanning, so that the report can be challenged.
34. As the OPE-7 owner, I want the React/TypeScript implementation in a separate ticket and PR, so that OPE-7's frozen OpenUI-versus-typed-JSON scorer remains reviewable.
35. As the OPE-7 owner, I want the ecosystem report to block the final verdict while remaining a separate report section, so that React evidence is neither ignored nor pooled.
36. As the project owner, I want OPE-7 alone to emit exactly one registered product outcome, so that an upstream evidence ticket or missing evidence cannot be narrated as a GO.
37. As an evaluator, I want every scenario requirement classified by route applicability, so that a Dioxus-specific guarantee cannot bias a React pairwise ranking.
38. As a Dioxus maintainer, I want direct RSX executed on the same applicable Dioxus targets, so that framework portability is not credited to the constrained runtime.
39. As a finance reviewer, I want first-adoption and steady-state costs reported over frozen horizons, so that amortization cannot be chosen after results are known.
40. As a correction reviewer, I want route-qualified operators in a blocked crossover, so that route familiarity is not mistaken for correction cost.
41. As a blind-review auditor, I want anchored rubrics, an agreement gate, and route guesses, so that recognizable styling or reviewer disagreement is visible.
42. As a data owner, I want synthetic fixtures scanned before provider calls and raw-evidence retention bounded, so that publication-time scanning is not the first disclosure control.
43. As a security reviewer, I want generated artifacts to remain untrusted after validation or compilation, so that accepted syntax cannot bypass action, resource, or effect policy.

## Implementation Decisions

- Preserve the OPE-3 archive byte-for-byte and import its OpenUI-versus-A2UI and OpenUI-versus-typed-JSON protocol outcomes as frozen context.
- Keep the existing 20-scenario, five-family OpenUI-versus-typed-JSON runtime-uncertain corpus as the primary product seam.
- Add `json-render v0.19.0` as an external dynamic-UI route through its official React catalog and renderer without translating it into the Dioxus Surface.
- Add a five-workflow compile-known cohort in which direct Dioxus/RSX may use ordinary compiled application structure and the shared typed host client without a generic Surface interpreter.
- Compare routes at the highest shared observable seam: content, state transition, registered intent, policy-visible result, feedback, and target behavior.
- Preregister an independent applicability table for every scenario requirement and prohibit pairwise scoring outside the compared routes' shared scope.
- Pin every upstream source by exact package/version and source revision before the canary.
- Use Dioxus Components as the 12-component primary catalog and Rust/UI as an at-least-eight-component second catalog spanning six certified families.
- Generate prompts, schemas, documentation, registry data, and release identity from one reviewed catalog declaration per Dioxus catalog.
- Freeze and hash the complete candidate decision manifest before a four-workflow canary with at most 16 provider calls and a 30-minute wall-time ceiling. Promote only the exact unchanged manifest; any change requires a new canary. Record `CANARY_INVALID` for infrastructure failure and prohibit product outcomes.
- Run the complete evidence generation only after OPE-6 is valid and the canary passes; complete all 20 runtime-uncertain and five compile-known workflows, then freeze anonymized review packets for OPE-7.
- Freeze provider configuration, session isolation, route order, one-repair limit, response limits, scenarios, prompts, source pins, rates, reviewers, scorer, and evidence schema before provider calls.
- Retain raw attempts, diagnostics, normalized or compiled artifacts, traces, screenshots, timers, costs, reviews, and recursive hashes.
- Record active human correction through at least two route-qualified correctors using identical practice tasks, blocked crossover assignment, balanced route order, fixed clock rules, and operator-level results; exclude provider, queue, build, and platform wait time.
- Randomize outputs and remove arm labels and route metadata for UI review; require at least three reviewers covering product design, frontend maintenance, and accessibility, frozen behavioral score anchors, ordinal Krippendorff alpha of at least 0.67, and post-score route guesses.
- Preserve the existing OpenUI-versus-typed-JSON hard gates and material-advantage thresholds.
- Report `json-render` and direct RSX as separate ecosystem and scope conclusions; do not average them into the primary scorer.
- Apply registered ecosystem vetoes after the primary scorer: external-route domination can prevent GO, runtime-only value maps to the runtime pivot, and a direct RSX win narrows compile-known scope without becoming a global veto.
- Require zero canonical runtime behavior changes for representation adapters, second-catalog onboarding, and catalog-local change drills.
- Require exact pinned replay or a deterministic side-effect-free copy-on-write migration; never mutate a source artifact.
- Permit only OPE-7 to classify results as `GO_OPENUI_DIOXUS`, `PIVOT_TO_SURFACE_RUNTIME`, `NO_GO`, or `INVALID_EVAL`; the ecosystem evidence ticket cannot emit those outcomes.
- Implement the React/TypeScript baseline outside OPE-7. The complete ecosystem ticket blocks OPE-7, which remains Todo while OPE-6 is unresolved and consumes ecosystem evidence in a separate unpooled section.
- Execute direct RSX representatives on the same applicable Dioxus target matrix and credit behavior shared with Surface routes to Dioxus rather than OpenUI.
- Report first-adoption cost over both catalogs, all 25 workflows, all drills, and every claimed target as the product hard-gate view; report a separate steady-state sensitivity view over the same workflows and one change cycle without initial onboarding.
- Use only synthetic non-sensitive fixtures, scan secrets and sensitive data before provider calls and publication, keep evaluation credentials least-privilege, and preregister raw-evidence access and retention.
- Treat generated artifacts as untrusted after validation or compilation; every live route uses allowlisted catalogs and actions, bounded inputs and resources, and deny-by-default effect mediation.

## Testing Decisions

- Test external behavior at the highest route-specific seam: official parser/schema acceptance for representations, compiler and route tests for direct code, rendered interaction for UI, and receipts/replay for runtime guarantees.
- Reuse the OPE-3 provider isolation and immutable archive patterns, the OPE-5 paired scheduler and symmetric scorer, the OPE-6 tri-state platform evidence semantics, and the OPE-4 catalog release identity.
- Verify neither the canary nor the ecosystem evidence stage can call the final scorer or serialize a product verdict.
- Verify a passing canary promotes a byte-identical decision manifest and any changed input forces a new manifest and canary.
- Use deterministic fake-provider and scorer fixtures before any real canary call.
- Verify balanced route order and fresh session identity for every provider attempt.
- Verify every rejected attempt contributes tokens, bytes, latency, correction, and cost.
- Differentially test OpenUI and typed JSON canonical fingerprints only where both routes legitimately share the Surface seam.
- Contract-test `json-render` against the same user-observable scenario outcomes without requiring Dioxus internals.
- Verify the applicability table excludes route-specific requirements from pairwise scores while retaining them as explicit support evidence.
- Compile, test, and sandbox direct RSX before execution; generated code receives no ambient network, credentials, or tools.
- Run catalog generation twice and require byte-identical derived artifacts.
- Verify second-catalog onboarding changes no canonical runtime behavior lines or runtime behavior files.
- Run each maintenance drill from a frozen commit and report changed handwritten/generated LOC, files, active time, and failures.
- Verify replay produces the same supported semantic fingerprint and zero external dispatches.
- Verify migration preserves the source artifact and records exact source and target compatibility vectors.
- Run automated accessibility checks plus frozen semantic assertions; add manual keyboard, VoiceOver, and TalkBack evidence for representative scenarios.
- Require ordinal Krippendorff alpha of at least 0.67 for each UI-review dimension. Repeat an invalid review with fresh reviewers over unchanged packets; mark above-chance route identification `UNBLINDED` and exclude the affected comparison from the GO quality gate.
- Require real rendered interaction or durable in-process markers and screenshots on every claimed target; compilation alone never passes.
- Run direct RSX representatives on the same applicable Web, Desktop, iOS, and Android checks as compile-known Dioxus Surface routes.
- Verify pre-provider fixture scans, least-privilege credential isolation, raw-evidence retention enforcement, action/resource allowlists, resource bounds, and deny-by-default effect mediation.
- Recompute metrics independently from raw records, verify recursive hashes, and scan committed evidence for credentials before publication.

## Out of Scope

- Implementing a production OpenUI-Dioxus runtime.
- Rerunning A2UI without a new preregistered protocol question.
- Automatic React, Figma, arbitrary JSON, or screenshot conversion.
- A stable Rust ABI or dynamically loaded third-party catalog.
- Porting all Rust/UI or `json-render` components.
- Building unsupported `json-render` platform wrappers after preregistration.
- Pixel-identical cross-platform output.
- Physical-device release certification, app-store packaging, governance, grants, or marketing claims.
- Merging any implementation or evidence pull request as part of OPE-9.

## Further Notes

The direct RSX cohort is intentionally allowed to establish that a constrained runtime should not be used for compile-known UI. That is a useful product boundary, not a failure of the evaluation.

The external React/TypeScript route is broader than a protocol arm but narrower than a universal platform baseline. Its result must name the exact renderer and targets exercised. Missing support is explicit scope evidence, not an automatic defect and not permission to infer parity.

OPE-9 ends after this specification, the required implementation tickets, documentary review, and a stacked Draft PR. No benchmark output produced in OPE-9 can contribute to a later verdict because OPE-9 runs no model benchmark.
