# OPE-6 platform and accessibility gates

## Shared runtime

- [x] Consume the accepted OPE-5 fake-preflight Surfaces without protocol-specific renderer branches.
- [x] Exercise state, typed action, accepted update, and inert replay through one shared host path.
- [x] Record explicit per-component Web, Desktop, iOS, and Android adaptations or fallbacks.

## Web and Desktop

- [x] Render and interaction-test every accepted Surface in Chromium and a real Dioxus Desktop process.
- [x] Prove keyboard-only traversal, visible focus, labels/roles, feedback announcements, and automated Web accessibility checks.
- [x] Capture process markers, traces, and non-empty screenshots with validated dimensions.

## Mobile

- [x] Install and launch one representative Surface per workflow family on an iOS Simulator.
- [x] Install and launch one representative Surface per workflow family on an Android Emulator.
- [x] Exercise state, typed action, update, and replay on both mobile families; compilation alone does not pass.
- [x] Missing iOS or Android execution produces `INVALID_EVAL`, never an inferred pass.

## Evidence

- [x] Recursively hash reports, traces, markers, and screenshots.
- [x] Scan committed artifacts for credentials.
- [x] Keep all platform claims explicitly scoped to simulator/emulator and prototype behavior.
