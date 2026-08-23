# Establish Dioxus platform and renderer constraints

Type: `research`
Status: `resolved`
Blocked by: none

## Question

What current Dioxus APIs and platform differences constrain one generated surface across desktop, web, and mobile, including event handling, state, custom components, styling, and renderer integration?

## Answer

Dioxus `v0.7.10` can share components, state, HTML attributes, CSS, and events across desktop, web, and mobile. This is primarily browser/WebView portability: web uses the browser DOM, while desktop and the stable mobile feature use the WebView-oriented desktop stack.

The runtime must stay platform-independent. Portable catalog components can share implementation, while filesystem, URLs, clipboard, notifications, permissions, and MCP execution pass through typed host actions. Claims for desktop, web, and mobile require separate builds and end-to-end interaction checks, including Android and iOS.

Research asset: [`docs/research/dioxus-platform-constraints.md`](../research/dioxus-platform-constraints.md).

## Adapter and platform implication

`PlatformHost` maximizes reuse of Dioxus target utilities while preserving the platform-independent runtime. Bounded local UI mechanisms may adapt focus, positioning, safe areas, keyboards, and platform-specific controls; filesystem, network, navigation, notifications, permissions, and MCP remain the exclusive responsibility of the `Application host` through typed actions and receipts. Semantics stay equal while presentation may adapt.
