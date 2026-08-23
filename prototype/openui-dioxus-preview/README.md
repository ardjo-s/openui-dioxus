# OpenUI-Dioxus preview

**PROTOTYPE** throwaway evidence for one MCP-shaped proposal becoming one
accepted projection rendered by one Dioxus component tree. This is not v0.1, not an
OpenUI conformance implementation, and **not full OpenUI conformance**.

## Run Desktop

```sh
cargo run --no-default-features --features desktop
```

The host controls edit and validate the proposal, intentionally submit the
invalid fixture, and create an inert replay from the last accepted checkpoint.
The generated button is the single `TypedAction::ApproveExpense` boundary.

## Verify all three platform feature checks

```sh
./scripts/verify-platforms.sh
```

This runs the exact Desktop host check, Web `wasm32-unknown-unknown` check, and
Mobile host-toolchain check. These are compilation checks, not device or runtime
certification: no browser session, iOS/Android device, Xcode build, or Dioxus
CLI (`dx`) run is claimed here. The Mobile rung only proves that the feature
compiles with the available host toolchain.

The A2UI-shaped file is a bounded baseline for this same eight-component
workflow. It uses a prototype/custom catalog and is not conformance-certified.
