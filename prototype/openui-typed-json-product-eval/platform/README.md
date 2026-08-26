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
gate unless every execution artifact is complete. Each target is an independent
job, so GitHub can rerun only the platform whose evidence or execution failed.

## Cloud profiles and timing

Manual dispatch exposes two profiles:

- `quick` regenerates the existing fixtures and runs the local contract probes.
  Its artifact is explicitly `quick-only` and cannot satisfy or claim the
  four-platform matrix.
- `full` runs Web, Desktop, iOS Simulator, Android Emulator, accessibility,
  recursive hashes, and aggregate enforcement. A push to the OPE-6 branch
  selects this profile automatically.

The full jobs use the official Dioxus CLI `0.7.10` release archive. The
published `.sha256` asset is downloaded or reused from the cache, and the
archive is verified before extraction and execution. Cargo registries, git
dependencies, target artifacts, and that CLI archive share keys bound to the
runner OS, runner architecture, target, Dioxus version, and
`dioxus-components-catalog-eval/Cargo.lock`.

Each full-platform evidence directory contains `traces/wall-time.txt` from
`/usr/bin/time -p`. Record cold and warm runs from the workflow summary or
artifact here after a cloud run; a cold run means a new cache key, while a warm
run reuses the exact key. The previous combined Web/Desktop job was the
baseline; platform-specific before/after values remain runner-dependent until
the first post-change full run.
