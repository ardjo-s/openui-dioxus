# Lock the desktop, web, and mobile v0.1 contract

Type: `grilling`
Status: `resolved`
Blocked by: 03, 06

## Question

Which behaviors, components, accessibility guarantees, styling rules, and automated checks must be equivalent across Dioxus desktop, web, and mobile for `v0.1` to claim cross-platform support?

## Answer

`v0.1` cross-platform support means that one canonical Surface preserves the same user-visible meaning on every certified target. Identity, values, validation, action intent, action outcome, state history, and replay stay equivalent. Layout, input mechanics, control presentation, and platform integration may adapt when the target requires it, but every adaptation is declared and tested. An unavailable capability produces a semantically equivalent fallback or a visible typed refusal; it never changes meaning silently.

The release certifies ten semantic capability families, not every component in an upstream library. Dioxus Components is the first candidate source for the reference catalog. Rust/UI and any other Dioxus design system may connect through separately reviewed, statically compiled catalog adapters. Dioxus Primitives may be reused inside an adapter as an implementation dependency; it is not a mandatory runtime layer or a catalog by itself.

The certified target floor is current Chromium, Firefox, and WebKit engines for Web; macOS for Desktop; and Android emulator plus iOS simulator for Mobile, completed by manual checks on one physical Android device and one physical iPhone before the `v0.1` release. Windows and Linux receive compile-and-launch smoke coverage but are not certified `v0.1` targets.

## Decisions

- **08-Q1 — Equivalent meaning, adaptable mechanics.** The same canonical Surface must preserve component identity, value, validation, action intent, action outcome, semantic event order, and replay across certified targets. Presentation and input mechanics may vary only when the platform requires it and the variation remains semantically equivalent.
- **08-Q2 — Publish support tiers.** A target or capability is `certified`, `smoke`, or `experimental`. `Certified` means the complete required matrix passes. `Smoke` means compile and launch only. `Experimental` means useful work exists but the project makes no compatibility claim. Documentation and negotiation expose the tier instead of reducing everything to a support boolean.
- **08-Q3 — Universal core, explicit extensions.** The certified core contains only behavior that all certified target families can provide. A platform-only capability is an explicit extension in the `PlatformHost` profile. A Surface that requires an unavailable extension receives an equivalent declared fallback or is refused before interaction.
- **08-Q4 — Bound the accessibility claim.** The reference catalog and project-owned reference surfaces must satisfy applicable WCAG 2.2 AA requirements. Each certified component declares name, role, value/state exposure, focus behavior, keyboard and touch behavior, error association, and text-resize expectations. The project does not claim that arbitrary model-generated compositions are automatically accessible; validation, automated checks, and manual assistive-technology review still apply.
- **08-Q5 — Name the evidence behind each platform claim.** Web certification covers release-pinned stable Chromium, Firefox, and WebKit builds. Desktop certification covers a release-pinned macOS version. Mobile certification covers pinned Android emulator and iOS simulator images plus manual release checks on one physical Android device and one physical iPhone whose OS versions are recorded. Windows and Linux are `smoke` in `v0.1`. Dioxus Native's separate WGPU/Winit renderer is outside this contract unless added later through its own evidence-backed target profile.
- **08-Q6 — Constrain platform adaptations.** Presentation, input modality, focus mechanics, safe-area behavior, virtual-keyboard handling, and control shape may adapt. Semantic identity, current value, validation result, action contract, policy decision, externally visible outcome, and canonical replay may not. The selected adaptation or fallback and its provenance are declared by the catalog and platform profiles.
- **08-Q7 — Certify semantic families, not an upstream checklist.** Inventory Dioxus Components as the first candidate source, reuse Dioxus Primitives where useful inside reviewed adapters, and certify the ten families below through representative components and scenarios. Do not promise every current or future Dioxus Components item, and do not discover executable components automatically.
- **08-Q8 — Share a visual language, not pixels.** Certified targets use the same design tokens, information hierarchy, content order, and semantic states. Responsive layout, density, typography metrics, safe areas, hover affordances, pointer versus touch behavior, and virtual-keyboard avoidance may differ. Cross-platform pixel equality is not an acceptance criterion.
- **08-Q9 — Match test cadence to claim strength.** Every pull request runs Rust/OpenUI contract tests, Web interaction checks, and compile checks for the other certified target families. The main branch or nightly workflow runs the complete macOS Desktop, Android emulator, and iOS simulator scenarios. A release candidate runs the full matrix plus the two physical-device reviews.
- **08-Q10 — Fallback or refuse explicitly.** A missing capability may use only a catalog-declared, semantically equivalent fallback. Otherwise validation returns a typed, visible `unsupported` result before the user can invoke it. A no-op, hidden degradation, invented mapping, or changed action meaning is forbidden.
- **08-Q11 — Keep responsive behavior outside Surface meaning.** OpenUI supplies the canonical structure and semantics. Catalog components and the `PlatformHost` own responsive presentation within declared rules. They may rearrange presentation without reinterpreting the Surface, fabricating data, or changing the action graph.
- **08-Q12 — Combine automation with assistive-technology review.** Automated checks cover accessible names, roles, states, contrast, text enlargement, reduced motion, focus order, and keyboard interaction where mechanically testable. Web and Desktop scenarios exercise keyboard and focus. Mobile scenarios exercise touch targets, zoom/text enlargement, safe areas, and virtual-keyboard behavior. VoiceOver and TalkBack are checked manually before `v0.1` and after a material change to a core interaction family.
- **08-Q13 — Ship ten certified capability families.** The required families are content, layout, actions, feedback, text entry, selection, forms and validation, lists, tables, and dialogs or confirmation. Tabs, accordions, charts, and other advanced families may ship only as `experimental` until their complete cross-platform contract passes.
- **08-Q14 — One certified-target failure blocks the claim.** A failure in any certified core family on any certified target blocks the `v0.1` cross-platform release. An unsupported platform extension does not block release when it was declared outside the certified core and negotiation refuses it correctly.
- **08-Q15 — Restore committed meaning without duplicate actions.** After suspend, restart, or an interrupted stream, restore the last stabilized Surface, its accepted state and history, and durable action/effect receipts. Resume only from an exact durable stream-transport checkpoint tied to the same operation and expected base; otherwise discard unaccepted chunks and start a new update from the last committed OpenUI program. Durable invocation identities prevent an action from being dispatched twice.
- **08-Q16 — Preserve catalog portability without a runtime rewrite.** The canonical runtime depends only on the OpenUI contract, catalog schemas and semantics, typed adapter API, and platform capability profile. It must not depend on the DOM, Dioxus Components, Rust/UI, Dioxus Primitives, or any React/Figma/JSON/screenshot source. A new Dioxus catalog may be added by implementing and certifying the same static contract. External converters stop at an inert draft and never modify runtime semantics.

## Certified capability families

| Family | Required representative behavior | Required equivalence |
| --- | --- | --- |
| Content | text, headings, icons or policy-controlled media | same content, hierarchy, labels, and resource outcome |
| Layout | stack, grouping, card, separator, responsive region | same reading and focus order; responsive arrangement may differ |
| Actions | primary, secondary, destructive, and disabled actions | same typed intent, policy result, outcome, and receipt |
| Feedback | status, alert, progress, empty, loading, and error states | same urgency, message, state transition, and assistive announcement |
| Text entry | single-line, multiline, required, disabled, and read-only input | same value, label, constraints, validation, and state lifetime |
| Selection | single and multiple choice | same options, selected values, disabled state, and change event |
| Forms and validation | grouped fields, submit, field and form errors | same data contract, validation timing, error association, and submit action |
| Lists | keyed static and dynamic collections | same item identity, order semantics, selection, and update continuity |
| Tables | headers, rows, cells, empty state, and basic responsive fallback | same data relationships and reading meaning; presentation may reflow |
| Dialogs or confirmation | open, focus entry, dismissal, confirm, and cancel | same modal intent and result; platform presentation may differ |

Every family needs at least one canonical fixture, an adapter declaration, Web/Desktop/Mobile assertions, accessibility evidence, and replay equivalence. A component count alone is not certification.

## Platform capability outcomes

A `PlatformHost` profile declares each required local UI mechanism as one of:

- `exact`: the reference interaction is available as declared;
- `adapted_equivalent`: mechanics or presentation differ while the certified semantics remain equal;
- `fallback_equivalent`: a catalog-declared replacement preserves the certified semantics;
- `unsupported`: validation refuses the requirement before interaction.

The selected outcome, platform profile, and fallback identity are part of compatibility evidence. `PlatformHost` remains a thin target adapter for bounded local UI mechanisms such as focus, positioning, safe areas, modality, and virtual-keyboard handling. It does not own filesystem, network, navigation, notifications, permissions, MCP, or other application effects; those remain exclusively behind the typed, policy-checked `Application host` boundary.

## Catalog portability invariant

`v0.1` uses a statically compiled Rust `CatalogAdapter` API and contract:

1. A catalog defines simple ordered OpenUI wire props, semantics, usage rules, typed events, and one reviewed Rust adapter for each component.
2. The application explicitly composes approved definitions and recompiles to add or replace a catalog adapter.
3. A catalog release pins `catalog_contract_version`, `schema_hash`, `catalog_release_hash`, `adapter_build_id`, Dioxus version and target, `PlatformHost` profile, and the `static_rust_v1` execution profile.
4. Direct Dioxus integration means compile-time adapter integration. It does not mean dynamic library discovery, binary hot-plugging, or a stable Rust ABI.
5. Dioxus Components, Rust/UI, and any Dioxus design system can implement the contract. Dioxus Primitives may be an internal behavior dependency of those implementations, never a mandatory runtime dependency.
6. shadcn/ui, Radix, Base UI, React Aria, Ariakit, React, Figma, arbitrary JSON, and screenshots follow `inert draft → Rust scaffold → unknowns report → human review → compilation and tests → certified catalog`. Unknown or ambiguous mappings remain explicit and may be refused.

This is a source/API compatibility commitment, not a promise that a compiled adapter binary will load forever. Old artifacts remain archivable. Executing them requires an exact supported environment or a registered migration.

## Adapter loading and future ABI policy

`v0.1` does not define a dynamic plug-in system or promise a stable Rust ABI. Rust's native ABI is not a suitable compatibility boundary for independently distributed adapters without an additional technology and operational contract.

Do not ban a binary boundary forever. Reopen it only when real adopters need to install or update an adapter without recompiling the application. That future decision must compare at least C FFI, `abi_stable`, the WebAssembly Component Model with WIT, and out-of-process RPC against the concrete requirements for integrity, isolation, resource limits, version negotiation, failure containment, deterministic identity, and replay. It becomes a separate versioned distribution profile; it must not reinterpret `static_rust_v1` catalogs as binary-compatible.

## Source constraints behind the ABI decision

- The [Rust Reference](https://doc.rust-lang.org/reference/items/external-blocks.html#abi) does not promise stability for Rust's own ABI. A plain dynamically loaded Rust library would therefore create a compatibility claim the project cannot honestly maintain.
- [`abi_stable`](https://github.com/rodrimati1992/abi_stable_crates) demonstrates that a Rust plug-in system is possible only by adopting an explicit FFI-safe type system and lifecycle constraints. That is a real architecture choice, not a free property of Rust code.
- The [WebAssembly Component Model and WIT](https://component-model.bytecodealliance.org/design/wit.html) provide machine-readable interfaces and a canonical ABI, but a future adapter would still need a deliberately designed rendering and event boundary instead of passing a Dioxus `Element` directly.
- The pinned Dioxus platform evidence remains in [the platform constraints research](../../../docs/research/dioxus-platform-constraints.md). The `v0.1` contract targets Dioxus's Web/WebView path; it does not generalize untested behavior from one renderer to every Dioxus target.

## Review during implementation

Reopen this contract only with representative evidence:

- Add or remove a certified family after scenario coverage shows that the ten-family floor is insufficient or disproportionate.
- Promote Windows, Linux, Dioxus Native, or another target only after the complete certified matrix passes there.
- Change a platform fallback only after accessibility, action, state, and replay tests prove semantic equivalence.
- Expand Dioxus Components coverage after inventory and quality evidence, not to satisfy an upstream component count.
- Introduce runtime-loaded third-party adapters only when a real no-recompile use case exists and the Q3 reopening proof in the runtime decision register is satisfied.
- Revisit physical-device scope when device evidence exposes an unsupported class or the release process has enough data to justify a different stable matrix.

## Adapter and platform implication

The two integration seams remain narrow. `CatalogAdapter` is a statically compiled, certified Rust contract for component behavior. `PlatformHost` is a thin, versioned target profile for bounded local UI adaptation. The `Application host` alone performs external effects. None of them may reinterpret the canonical runtime or hide an unsupported capability.
