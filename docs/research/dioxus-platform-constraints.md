# Dioxus desktop, web, and mobile constraints

Research date: 2026-08-22<br>
Stable target: `Dioxus v0.7.10`, commit `57d6794ad60b949e5bd8aa282f6f8c3dc97a365e`<br>
Upstream reference: `main@24f6a829df0dfa203961a98ea4cae21c2ff27e28`

## Finding

Dioxus can share the generated component tree, state model, HTML attributes, CSS, and events across desktop, web, and mobile. In stable `v0.7.10`, this portability is primarily browser/WebView portability, not three independent native-widget renderers.

Sources: [Dioxus `v0.7.10` release](https://github.com/DioxusLabs/dioxus/releases/tag/v0.7.10), [framework README](https://github.com/DioxusLabs/dioxus/blob/v0.7.10/README.md), [Dioxus package features](https://github.com/DioxusLabs/dioxus/blob/v0.7.10/packages/dioxus/Cargo.toml).

## Shared layer

- Dioxus components produce a shared Virtual DOM and use the same hooks/signals model before platform renderers apply mutations.
- The umbrella `dioxus` crate exposes platform features and one launch builder. Compile-time features choose desktop, mobile, web, server, or another renderer.
- `dioxus-html` supplies HTML elements, attributes, listeners, and ARIA-related attributes. CSS and Tailwind can style the same component tree on the three requested targets.
- A generated surface should therefore target registered Dioxus components, not platform renderer internals.

Sources: [launch selection](https://github.com/DioxusLabs/dioxus/blob/v0.7.10/packages/dioxus/src/launch.rs), [core Virtual DOM](https://github.com/DioxusLabs/dioxus/blob/v0.7.10/packages/core/src/virtual_dom.rs), [HTML package](https://github.com/DioxusLabs/dioxus/tree/v0.7.10/packages/html).

## Platform differences

### Web

The web renderer applies Virtual DOM mutations to the browser DOM through WASM and `web-sys`. Browser APIs, hydration, and browser security policies apply.

Source: [Dioxus web package](https://github.com/DioxusLabs/dioxus/tree/v0.7.10/packages/web).

### Desktop

The desktop renderer hosts the same HTML/CSS UI in a Wry/WebView window and adds desktop-only window, menu, protocol, filesystem, and native event capabilities. Generated surfaces should not directly depend on these capabilities; typed host actions should expose them deliberately.

Source: [Dioxus desktop package](https://github.com/DioxusLabs/dioxus/tree/v0.7.10/packages/desktop).

### Mobile

In `v0.7.10`, the umbrella `mobile` feature depends on `dioxus-desktop`; Android and iOS run through the mobile WebView path while allowing JNI or Objective-C interop. Shared HTML/CSS is realistic, but native toolchains, safe areas, keyboards, touch behavior, permissions, and device lifecycle remain distinct verification work.

Source: [`mobile` feature definition](https://github.com/DioxusLabs/dioxus/blob/v0.7.10/packages/dioxus/Cargo.toml), [mobile claims and commands](https://github.com/DioxusLabs/dioxus/blob/v0.7.10/README.md).

## v0.1 constraints

1. Keep the OpenUI parser and runtime independent of Dioxus platform crates.
2. Render only through a registered component catalog whose components declare responsive, keyboard, touch, and accessibility expectations.
3. Use portable HTML/CSS/event semantics in generated surfaces. Route filesystem, URL opening, clipboard, notifications, and MCP execution through typed host actions with platform-specific implementations.
4. Treat ARIA attribute availability as plumbing, not proof of accessibility. Test focus order, labels, keyboard interaction, reduced motion, contrast, and screen-reader semantics in representative browser and WebView environments.
5. Give every surface and state node stable identity so streaming updates do not remount controls or erase user input.
6. Verify at least one build and end-to-end interaction on web, desktop, Android, and iOS before claiming all three target families. Desktop plus a responsive browser viewport does not prove mobile support.
7. Keep platform deviations explicit in a capability manifest. A surface requiring an unavailable host action must be rejected or rendered with a declared fallback.

## Compiled integration seams

Cross-platform support should reuse the Dioxus ecosystem through two certified adapters, not by importing every concrete library into the runtime:

- `CatalogAdapter` binds approved OpenUI props and events to Dioxus Components, Rust/UI, or a private Dioxus design system and is statically compiled into the application in `v0.1`. Dioxus Primitives may be an internal implementation dependency.
- `PlatformHost` declares Web, Desktop, or Mobile capabilities and adapts presentation or input mechanics without changing Surface meaning.

Bounded local UI mechanisms such as focus, portal mounting, positioning, safe areas, input modality, virtual-keyboard behavior, and approved platform-control substitution may stay renderer-side with no hidden external I/O or business effect. Every host-visible effect such as filesystem access, clipboard, navigation, notifications, permissions, MCP, or network-backed resources still crosses the typed, policy-checked `Application host` boundary and produces a receipt.

React, Radix, Base UI, React Aria, Ariakit, Floating UI, Figma, JSON, and screenshots remain behavioral references or conversion sources until reviewed Rust code is compiled into a certified adapter.

Direct integration here means a reviewed Rust adapter compiled with the application. It does not imply dynamic plug-in discovery or a stable Rust ABI. A no-recompile distribution boundary remains a separate future decision triggered by a demonstrated adopter need.

## Open unknowns for prototype work

- Whether Dioxus hot reload or template optimizations preserve stable identity under a fully dynamic renderer.
- Mobile keyboard, focus, safe-area, and background/resume behavior for streamed form state.
- Screen-reader parity across browser, macOS/Windows WebViews, Android WebView, and WKWebView.
- How much of the first component catalog can remain pure Dioxus HTML versus requiring platform-specific wrappers.

These unknowns justify the dedicated cross-platform contract and prototype tickets; they do not block the architecture map.
