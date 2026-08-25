# OPE-6 platform and accessibility proof

This harness renders the 40 accepted OPE-5 fake-preflight representations one
at a time through the same compiled Dioxus Components catalog. Each Surface
runs the same state, allowlisted typed action, accepted update, and inert replay
probe. No protocol-specific renderer branch exists.

Web uses Chromium, Playwright, axe-core, keyboard traversal, visible-focus
checks, status announcements, and screenshots. Desktop requires a real Dioxus
process marker plus a non-empty, dimension-validated window capture. iOS and
Android require installation, launch, runtime markers, and screenshots on a
Simulator and Emulator respectively.

The mobile and desktop targets use Dioxus WebViews. This prototype does not
claim native widgets, physical-device certification, VoiceOver/TalkBack review,
pixel identity, packaging, or app-store readiness. Declared adaptations and
fallbacks live in `fixtures/platform-profile.json`.

The branch-only GitHub workflow runs all four targets and fails its aggregate
gate unless every execution artifact is complete.
