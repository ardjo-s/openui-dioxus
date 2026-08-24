# OPE-6 platform evidence

Local and CI scratch evidence is ignored. After a complete cloud run, verified
artifacts are copied into `published/`, recursively checksum-verified, and
committed on the OPE-6 branch.

A valid aggregate requires real execution on Chromium Web, Dioxus Desktop, an
iOS Simulator, and an Android Emulator. Missing mobile infrastructure produces
`INVALID_EVAL`; compilation alone never passes.
