# Prove differentiation against existing generative UI alternatives

Type: `research`
Status: `resolved`
Blocked by: none

## Question

Against current OpenUI React, JSON Render, A2UI, Rust UI libraries, and ordinary LLM-generated React or Expo code, what problem remains uniquely or materially better served by OpenUI Dioxus?

## Answer

A Dioxus renderer alone is not a durable differentiator. OpenUI React, JSON Render, and A2UI already cover most catalog, streaming, state, action, and declarative safety mechanics.

The defensible scope is full OpenUI Lang conformance in Rust, a versioned replayable surface model, typed Rust/MCP action mediation, state reconciliation, a cross-platform Dioxus catalog, a design-system manifest, and a reusable conformance/evaluation corpus. The prototype must beat a small JSON Render or A2UI-style Dioxus adapter on at least one measured dimension or the project should stop or reposition.

Research asset: [`docs/research/differentiation.md`](../research/differentiation.md).

## Adapter and platform implication

The seams are differentiating only if a second certified catalog or platform implementation can be added without changing runtime semantics and with lower measured maintenance than parallel frontend stacks. A universal-adapter claim without this proof would weaken the project.
