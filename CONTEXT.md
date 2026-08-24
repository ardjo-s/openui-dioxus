# Domain glossary

## OpenUI Dioxus

The umbrella effort combining an OpenUI language integration, a Dioxus rendering target, a constrained generative UI runtime, and a design-system bridge.

## Surface

The stable runtime identity and state namespace for one interface history.

_Avoid_: Surface revision, rendered tree

## OpenUI source

The raw full-replacement or patch input received in the public OpenUI language.

_Avoid_: OpenUI program revision, executable Surface

## OpenUI program revision

An immutable complete OpenUI program produced after accepting a replacement or whole-program patch. It is the authoritative base for later OpenUI patches but is never executed directly.

_Avoid_: Raw source chunk, Surface revision

## Surface revision

An immutable numbered structural tree derived from an OpenUI program candidate or revision. It is the only structural authority for Dioxus rendering, actions, and replay; only a committed revision accepts generated interaction.

_Avoid_: OpenUI program revision, mutable Surface, runtime state

## Render projection

The visible result of combining one Surface revision with semantic state and results at one event watermark.

_Avoid_: New Surface revision for every keystroke

## Surface update operation

One explicitly typed full replacement or named-statement patch, with a unique operation identity and an expected OpenUI program base.

_Avoid_: Inferred merge, patching a Surface revision

## Instance identity

The runtime-owned stable semantic identity of one stateful, actionable, or reorderable occurrence, separate from its OpenUI statement name and Dioxus key.

_Avoid_: Statement ID, list position

## Renderer key

A Dioxus reconciliation key that is unique and consistently present within one keyed sibling group. It is not a durable domain identity.

_Avoid_: Instance identity

## Publishable subtree

A whole named-statement subtree that is framed, dependency-closed, catalog-valid, and inert enough to appear provisionally while surrounding input remains incomplete.

_Avoid_: Parser-complete node, placeholder node

## Runtime

The trust boundary that turns streamed model output into accepted surfaces and mediates their state and actions.

## Renderer

The Dioxus-facing layer that presents Surface revisions through registered pure view adapters and emits typed user events.

_Avoid_: Effect executor, semantic state owner

## Inert renderer

A renderer mode in which external navigation, network access, ambient resource retrieval, tools, and host effects are disabled.

_Avoid_: Live reopen

## Application host

The product environment that alone owns host-visible effects requested through runtime-mediated actions, resources, navigation, or assistant handoff.

_Avoid_: Runtime, renderer

## PlatformHost

A thin, versioned target integration that connects the stable renderer to bounded Web, Desktop, or Mobile UI mechanisms. It adapts presentation and input mechanics but does not implement host-visible application effects. Those remain owned by the Application host through typed, policy-checked Effect invocations.

_Avoid_: Alternate runtime, direct operating-system access from a component

## Platform UI capability

A bounded local UI mechanism such as focus, portal mounting, positioning, safe-area handling, input-modality detection, virtual-keyboard adaptation, or approved platform-control substitution. It may adapt presentation and input mechanics without changing Surface semantics, performing hidden external I/O, or initiating a business effect.

_Avoid_: Filesystem access, network request, navigation, notification, permission prompt

## Component catalog

The allowlisted vocabulary of components, properties, composition rules, and interaction capabilities available to generated surfaces.

## Catalog view adapter

A trusted compiled component implementation that renders declared inputs and emits typed events without hidden I/O, navigation, semantic randomness, or persistent semantic state.

_Avoid_: Dynamic untrusted plug-in

## CatalogAdapter

A versioned Rust API and contract implemented by one approved component catalog and statically compiled into the application in `v0.1`. It binds OpenUI wire props and typed events to Dioxus components or headless primitives without changing runtime semantics. Dioxus Components, Rust/UI, and private Dioxus design systems may connect directly through separate certified adapters. Dioxus Primitives may be an internal adapter dependency, not a mandatory runtime layer.

_Avoid_: Stable Rust ABI promise, dynamic untrusted plug-in, universal direct compatibility with React or arbitrary JavaScript libraries

## Catalog release

An immutable executable catalog identity fixing `catalog_contract_version`, schema and semantics hashes, `catalog_release_hash`, `adapter_build_id`, Dioxus version and target, adapter execution profile, platform profile, and resource capabilities. `v0.1` uses the `static_rust_v1` execution profile and makes no binary ABI promise.

_Avoid_: Latest catalog, compatible catalog

## Resource reference

A typed request for content whose resolution, capture, and rendering are controlled by the host resource policy.

_Avoid_: A component fetching an arbitrary URL

## Resource policy

The host rule deciding which resources may be resolved, from where, with which integrity checks, and whether they may be captured for replay.

## Design-system bridge

The small OpenUI-shaped contract through which reviewed wire props, a certified CatalogAdapter, descriptions, semantics, usage rules, and later design tokens become a component catalog and its generated artifacts.

_Avoid_: Automatic Dioxus component discovery, alternate runtime protocol

## Bridge component definition

One approved declaration containing a component name, explicit `prop_order`, simple serializable OpenUI props, description, reviewed semantics and usage rules, and a trusted adapter to the real Dioxus component.

_Avoid_: Reusing arbitrary Dioxus `Properties` as a wire schema

## Catalog source

The explicit `catalog![]` composition of approved bridge component definitions from which the OpenUI-compatible `LibrarySpec`, JSON Schema, prompt material, documentation, static Dioxus registry, and minimal hashed release metadata are generated.

_Avoid_: Reflection, filesystem scan, latest available component

## Converter draft

An inert, non-registrable bridge proposal produced from a conversion source such as React, shadcn/ui, Radix, Figma, arbitrary JSON, or screenshots. It may include a Rust scaffold and an unknowns report, but requires human review and successful compilation before it can enter a catalog source.

_Avoid_: Directly executable imported component

## Conversion source

External design or component material used to propose a Converter draft. It is evidence for conversion, not a runtime dependency and not a certified adapter.

_Avoid_: Directly executable React, JavaScript, Figma, JSON, or screenshot input

## Design-token adapter

A phase-1b transformation from DTCG tokens into theme or CSS inputs consumed by approved Dioxus adapters. It changes presentation inputs, not OpenUI language or canonical runtime semantics.

## Stabilized surface

An atomically committed end-of-stream Surface revision with no blocking diagnostics and a complete pinned compatibility vector.

_Avoid_: Replay checkpoint, final application state

## Action

A typed, allowlisted user interaction that the runtime may dispatch to an application or tool.

## Action invocation

One uniquely identified claim of user intent, bound to the committed Surface revision, target, typed values, action plan, catalog contract, and policy the user actually saw.

_Avoid_: Click event, tool call

## Stale action

An Action invocation whose meaning, target, values, or authorization no longer matches the current accepted Surface revision.

_Avoid_: Automatically rebased action

## Action receipt

The summary of one Action invocation and its ordered local and external steps. It never replaces individual effect receipts.

_Avoid_: Assumed success

## Effect invocation

One uniquely identified, policy-checked request for the application host to perform a host-visible effect, durably prepared before dispatch.

_Avoid_: Direct query, direct navigation, hidden component fetch

## Effect receipt

The durable outcome of one effect step: succeeded, failed, denied, or unknown.

_Avoid_: Assumed success, automatic retry after unknown

## Quarantined update

An entire update operation withheld from commit because its candidate program contains a blocking error.

_Avoid_: Hybrid program assembled from old and new blocks

## Blocking diagnostic

A structured validation finding that prevents final stabilization because accepted meaning, data, policy, action integrity, or a required rule cannot be guaranteed.

_Avoid_: Warning, recoverable advice

## Advisory diagnostic

A structured non-blocking finding preserved for improvement, evaluation, and audit.

_Avoid_: Ignored issue

## Diagnostic fingerprint

A stable identity derived from rule, normalized location, and compatibility context so two runs can recognize the same problem.

_Avoid_: Comparing human-readable messages

## Migration

A deterministic, side-effect-free transformation between two exact compatibility vectors that creates a validated copy while preserving its source artifact.

_Avoid_: In-place upgrade, silent conversion

## Archive bundle

An inspectable and exportable preservation of an artifact, evidence, omission manifest, and optional self-contained inert preview that does not promise continued interactive execution.

_Avoid_: Replay guarantee, live reopen

## State slot

A value addressed by `(session identity, Surface identity, exact OpenUI $name)`, preserved across Surface revisions until OpenUI reset or session teardown. Removing its source declaration does not delete it.

_Avoid_: Component-local semantic state, inferred deletion, default-inferred type

## Compatibility profile

The pinned OpenUI language specification, reference implementation, source revision, and conformance corpus against which semantic compatibility is claimed.

## Compatibility vector

The complete set of behavior-affecting identities required to decide execution or migration, including language, schemas, catalog contract and release hashes, CatalogAdapter build and execution profile, Dioxus version and target, PlatformHost capability profile, policies, replay, and event contracts.

_Avoid_: Compatibility inferred from one version number

## Capability manifest

The versioned declaration of language support, certified CatalogAdapter, component catalog, host actions, tools, replay schema, and PlatformHost capabilities available in one runtime environment.

## Host-action policy

The runtime rule that classifies each requested effect as allowed, approval-required, denied, or unsupported independently of whether the OpenUI language can express it.

## Replay envelope

The self-contained record required to reproduce supported semantics without another model, network call, navigation, ambient fetch, or host effect.

## Replay capture policy

The explicit classification and host rule that decides which replay data may be retained, protected, redacted, or omitted.

_Avoid_: Inferred sensitivity, save everything

## Replay fidelity

The declared completeness of a replay envelope after capture-policy omissions: `full` is executable; `redacted` and `partial` are audit replays that halt at the first missing dependency.

_Avoid_: Exact replay when data is missing

## Execution projection

The minimal typed subset of transient input required to evaluate an authorized action or effect.

## Capture projection

The separately classified subset allowed into logs, receipts, checkpoints, and exports, with explicit redactions and omissions.

_Avoid_: Raw form state

## Semantic event

A replay-relevant ordered fact about a published or committed Surface revision, state, action, effect, result, diagnostic, migration, or checkpoint, distinct from raw input telemetry.

_Avoid_: Keystroke log, pointer trace

## Semantic event sequencer

The single monotonic order for revision commits, state changes, action claims, effect preparation and receipts, results, diagnostics, migrations, and checkpoints within one Surface.

## Observation barrier

An event that can observe semantic state and therefore forbids coalescing earlier state changes across it.

_Avoid_: Coalescing across an action, policy check, resource, effect, diagnostic, commit, or checkpoint

## Replay checkpoint

An immutable seal over a stabilized Surface and policy-authorized semantic inputs and outcomes through one explicit event watermark, with an omission manifest and no unresolved invocation.

_Avoid_: Session end, mutable save

## Replay divergence

A detected mismatch between stored replay state and its pinned source or compatibility evidence.

_Avoid_: Automatic replay correction

## Must-understand element

A versioned field or extension whose meaning may affect behavior and therefore must be supported or migrated before execution.

_Avoid_: Best-effort unknown field

## Write conflict

The rejection of an update because its expected OpenUI program base is no longer current.

_Avoid_: Last-write-wins, silent rebase

## Correction orchestrator

The application-owned coordinator that may submit validation diagnostics to a model under an explicit correction budget.

_Avoid_: Runtime, validator

## Correction budget

The externally declared limits on correction attempts, elapsed time, and cost.

_Avoid_: Unbounded retry loop

## Live reopen

A new execution that may reconnect tools or external data, distinct from deterministic replay.

## Adopter

A Rust/Dioxus product team combining three roles: Dioxus integrator, agent or MCP tool builder, and design-system maintainer.

## Runtime-uncertain workflow

A workflow whose interface structure, data shape, allowed actions, or revisions cannot be fully fixed when the application is compiled and must arrive as validated non-executable data at runtime.

_Avoid_: Any workflow that merely contains dynamic values

## Compile-known workflow

A workflow whose interface structure, actions, and design-system bindings are known when the application is compiled, even if its ordinary data values change later.

_Avoid_: Static screenshot, runtime-generated Surface

## Primary product baseline

The strict typed-JSON Dioxus representation derived from the same catalog source and normalized through the same canonical runtime boundary as OpenUI. It is the simplest credible control for product-value claims.

_Avoid_: A2UI, direct RSX, React/TypeScript ecosystem baseline

## Canary evaluation

A small, fast, non-decision run that proves evaluation infrastructure and detects drift before the complete evaluation. It can block a full run but can never emit a product verdict.

_Avoid_: Reduced decision-grade sample

## Decision-grade evaluation

A preregistered complete run whose frozen cohorts, sources, prompts, reviewers, platform evidence, maintenance drills, costs, and checksums satisfy every validity gate required for a product verdict.

_Avoid_: Canary, fake-provider preflight, protocol-only benchmark
