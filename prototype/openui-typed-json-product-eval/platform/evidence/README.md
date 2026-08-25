# OPE-6 platform evidence

Local and CI scratch evidence is ignored. After a complete cloud run, verified
artifacts are copied into `published/`, recursively checksum-verified, and
committed on the OPE-6 branch.

A valid aggregate requires real execution on Chromium Web, Dioxus Desktop, an
iOS Simulator, and an Android Emulator. Missing mobile infrastructure produces
`INVALID_EVAL`; compilation alone never passes.

## Published result

Run `32847665208` at commit `d7bb0a9` is the accepted OPE-6 evidence set. Its
aggregate reports `PASS` for Web, Desktop, iOS, and Android. The downloaded
artifact was recursively checksum-verified, visually inspected across all four
targets, and scanned for common API keys, GitHub tokens, private keys, and
authorization headers before publication.

The immutable files live in `published/run-32847665208/`. This proves the
prototype's Dioxus Web and WebView path on Chromium, Linux Desktop, an iOS
Simulator, and an Android Emulator. It does not prove physical-device behavior,
native widgets, touch ergonomics, VoiceOver, TalkBack, packaging, or app-store
readiness.

The [standards and intent review](../../../../docs/research/ope-6-platform-evidence-review.md)
records the final evidence boundary.
