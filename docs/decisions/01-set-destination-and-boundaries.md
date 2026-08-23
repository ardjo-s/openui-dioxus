# Set the destination and initial v0.1 boundaries

Type: `grilling`
Status: `resolved`
Blocked by: none

## Question

What destination, product boundary, adopter, platform ambition, and OSS horizon should this wayfinding effort pursue?

## Answer

The destination combines three outcomes: an evidence-backed go/no-go decision, an implementation-ready MVP specification, and a roadmap to a credible OSS `v0.1`.

OpenUI Dioxus is one umbrella with three modules: renderer, deterministic runtime, and design-system bridge. Its adopter is one Rust/Dioxus product team expressed through three roles: Dioxus integrator, MCP or agent builder, and design-system maintainer.

The primary proof is an enriched MCP vertical, not a generic schema form. It composes an interface from intent, tools, and results; validates it; renders it under a design system; dispatches typed actions; and persists it for replay. Desktop, web, and mobile are required `v0.1` targets. Commercialization, Bun, e-ink specialization, and implementation of automatic React/Figma conversion are outside this map.

## Adapter and platform implication

The three umbrella modules remain unchanged. `CatalogAdapter` and `PlatformHost` are stable extension seams inside the bridge and renderer boundaries, not new product modules. The `v0.1` proof must exercise one certified catalog adapter and the Web, Desktop, and Mobile platform hosts.
