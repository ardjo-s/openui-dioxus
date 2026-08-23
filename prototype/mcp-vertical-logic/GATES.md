# Gates: MCP vertical logic prototype

Question: Does the proposed MCP-to-Surface state flow make the runtime's extra guarantees understandable and useful when compared with a thin Dioxus adapter?

Scope: one dependency-free, in-memory, throwaway HTML prototype. This probe explores logic and user comprehension; it does not prove OpenUI conformance, real MCP transport, Dioxus rendering, device behavior, or product value.

- [x] P1: `index.html` is a self-contained double-clickable prototype with an explicit throwaway warning and the design question visible on screen.
- [x] P2: One pure reducer owns the state transitions; rendering and controls only dispatch actions and display the returned state.
- [x] P3: Free play exposes MCP schema loading, result arrival, proposal generation, validation, catalog swap, typed approval, checkpoint, replay, invalid proposal, profile comparison, and reset.
- [x] P4: Guided walkthroughs cover the happy path, atomic rejection, catalog-swap invariance, inert replay, and the thin-adapter comparison.
- [x] P5: The complete relevant state and ordered event log are visible after every action, with no persistence, network call, framework, package, or build step.
- [x] P6: The difficult cases are observable: invalid candidates preserve the last committed Surface; adapter swaps preserve the semantic fingerprint; replay adds no external effect; the thin profile exposes its missing guarantees instead of silently simulating them.
- [x] P7: The prototype records a bounded verdict and ticket 09 links the primary-source branch while remaining `open`.
- [ ] P8: Manual browser driving confirms every walkthrough can complete and reset at desktop and narrow widths without uncaught errors.

## Verification evidence

- Inline JavaScript parses successfully with the bundled Node runtime.
- Reducer driver: five walkthroughs out of five completed; one typed action and receipt; committed Surface preserved after rejection; semantic fingerprint unchanged after catalog swap; zero replay effects; thin profile exposed one unreceipted effect and an explicit replay gap.
- Static document scan confirms the tablist, walkthrough panel, free-play controls, Surface projection, full-state inspector, semantic-event log, and narrow-width CSS rule.
- Browser limitation: the in-app browser rejected the local `file://` URL by policy and the bundled Playwright installation has no browser executable. No browser or policy workaround was attempted. P8 remains open for a human double-click review.
