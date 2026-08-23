# Write the implementation-ready v0.1 specification and roadmap

Type: `grilling`
Status: `open`
Blocked by: 10, 11

## Question

What exact scope, package boundaries, acceptance criteria, milestones, non-goals, and sequencing constitute the approved MVP and credible OSS `v0.1` roadmap?

## Adapter and platform implication

The specification must name separate package boundaries for the core runtime, Dioxus renderer, statically compiled catalog adapters, thin platform hosts, and application-host effects. It must publish the certification matrix, make the absence of a stable Rust ABI explicit, and keep React, Figma, JSON, and screenshot converters outside the executable runtime boundary.
