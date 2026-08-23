# Decide which OpenUI capabilities the Dioxus integration must preserve

Type: `research`
Status: `resolved`
Blocked by: none

## Question

What capabilities and semantics does current OpenUI provide, which are React-specific implementation details, and what compatibility contract would preserve all material OpenUI advantages in a Dioxus runtime?

## Answer

Target full OpenUI Lang `v0.5` semantic compatibility while versioning component-catalog coverage separately. OpenUI already exposes a framework-generic `@openuidev/lang-core`; React is an adapter layer.

The Rust implementation should preserve streaming and partial parsing, schemas and prompt generation, reactive state, built-ins, Query/Mutation, declarative actions, incremental merging, validation, and structured errors. Differential tests against pinned upstream snapshots become the compatibility oracle. The internal `Surface` is a replay representation, not a new wire protocol.

Research asset: [`docs/research/openui-capabilities.md`](../../../docs/research/openui-capabilities.md).

## Adapter and platform implication

Full OpenUI semantic compatibility remains independent of any component library or target device. Catalog coverage and PlatformHost capabilities are negotiated separately; neither seam may fork or silently weaken OpenUI behavior.
