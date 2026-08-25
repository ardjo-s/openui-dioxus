---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
ticket: OPE-6
title: Recover valid Android emulator evidence
base: codex/ope-6-platform-accessibility
---

## Problem Statement

OPE-6 has complete Web, Desktop, and iOS evidence, but the Android emulator produced `INVALID_EVAL` because the system image became unresponsive before the runtime marker could be accepted. The aggregate therefore correctly fails, leaving OPE-6 and downstream OPE-11 blocked. Compilation or a green wrapper job cannot replace executed Android evidence.

## Solution

Repair the narrow Android execution path on the existing OPE-6 branch. Reuse the current Dioxus application, runtime marker, evidence JSON, aggregation logic, and GitHub Actions emulator runner. Change only the smallest emulator or launch behavior proven necessary by the failed logs, then rerun the complete four-platform workflow. Accept completion only when Android emits the existing marker, captures a valid screenshot, reports `PASS`, and the unchanged aggregate reports `PASS`.

## User Stories

1. As the evaluator, I want the Android application to execute in an emulator, so that compilation is not misreported as platform evidence.
2. As the evaluator, I want the existing 40-surface, five-family marker to remain the behavioral oracle, so that a CI workaround cannot weaken the test.
3. As the evaluator, I want system-image or transport failure classified as `INVALID_EVAL`, so that infrastructure failure is not scored against the product.
4. As a downstream OPE-11 implementer, I want one complete four-platform aggregate, so that the canary starts from valid platform evidence.
5. As a reviewer, I want the Android fix isolated from OPE-8 speed work, so that the OPE-6 correctness decision remains independently reviewable.
6. As a maintainer, I want the existing runner and shell scripts reused, so that the recovery adds no new framework or dependency.

## Implementation Decisions

- [U1] Treat the downloaded Android logcat, install trace, launch trace, result JSON, and screenshot as the authoritative failure evidence.
- [U2] Keep `run-android.sh` and its result JSON as the single public Android evidence seam; do not add a second probe or substitute marker.
- [U3] Keep the existing Dioxus binary, package install, typed action/state/update/replay self-test, and `PLATFORM_SELF_TEST_PASS surfaces=40 families=5` marker unchanged.
- [U4] Apply the smallest proven emulator-stability or app-launch correction in the OPE-6 workflow/script. Do not import the broader OPE-8 CI refactor.
- [U5] Preserve failure honesty: unavailable emulator, broken package manager, missing marker, system ANR, missing screenshot, or invalid dimensions remain non-pass outcomes.
- [U6] Rerun the full OPE-6 workflow. OPE-6 is complete only when Web, Desktop, iOS, Android, and aggregate jobs all provide complete passing evidence.
- [U7] Publish the successful run URL, artifact identities, checksums, and review outcome in Linear and the existing Draft PR.

## Testing Decisions

- Test external evidence behavior, not helper implementation details.
- Use the existing platform evidence tests to protect result classification and aggregation.
- Add or adjust one narrow regression test only if the failure exposes an untested deterministic branch in the workflow or shell contract.
- Run shell syntax validation and the existing Node/Rust platform checks locally.
- Use the cloud Android emulator run as the required execution check; a local compile is supporting evidence only.
- Verify the final aggregate from downloaded artifacts and require `evidence_status == "PASS"`.

## Out of Scope

- OPE-8 workflow-speed changes.
- New emulator providers or paid device farms.
- Physical-device certification.
- Native Android widgets.
- Weakening the marker, screenshot, accessibility, or aggregation gates.
- OPE-10 or OPE-11 implementation.

## Further Notes

The failed full run is GitHub Actions run `32828706017`: Web/Desktop and iOS passed, while Android recorded `Android system image became unresponsive`. The fix must increase the solvency of the existing evidence path, not add parallel infrastructure.

## Resolution

Run `32847665208` passed at commit `d7bb0a9`. The release APK was built before emulator startup, the API 34 x86_64 `pixel_3a` image produced the exact 40-surface and five-family marker, and the strict screenshot gate accepted a visibly rendered Android frame. The same run also produced visible Web, Desktop, and iOS captures. Its aggregate, traces, screenshots, result JSON, and recursive checksums are published under `prototype/openui-typed-json-product-eval/platform/evidence/published/run-32847665208/`.

The intermediate `aosp_atd` run `32846772231` remained `INVALID_EVAL`: its runtime marker passed, but its framebuffer was fully black. That rejection is retained as evidence that runtime markers cannot replace rendered visual proof.
