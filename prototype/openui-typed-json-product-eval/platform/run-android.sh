#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
catalog="$repo_root/prototype/dioxus-components-catalog-eval"
platform="$repo_root/prototype/openui-typed-json-product-eval/platform"
evidence=${OPE6_EVIDENCE_DIR:-$platform/evidence/platform-android}
mkdir -p "$evidence/screenshots" "$evidence/traces"
result="$evidence/android.json"
rm -f "$result"
status=INVALID_EVAL
error=""
apk=""

finish() {
  jq -n --arg status "$status" --arg error "$error" \
    '{platform:"android",status:$status,passed:($status == "PASS"),evidence_complete:($status == "PASS"),surfaces:40,families:5,error:(if $error == "" then null else $error end)}' > "$result"
}
trap finish EXIT

build_apk() {
  local dx_bin=${DIOXUS_CLI_BIN:-}
  if [ -z "$dx_bin" ]; then dx_bin=$(command -v dx || true); fi
  if [ -z "$dx_bin" ] || [ ! -x "$dx_bin" ]; then error="Dioxus CLI unavailable"; return 1; fi
  if ! command -v rustup >/dev/null; then error="rustup unavailable"; return 1; fi
  if ! rustup target add x86_64-linux-android; then error="Android Rust target unavailable"; return 1; fi
  cd "$catalog"
  status=FAIL
  if ! "$dx_bin" build --platform android --target x86_64-linux-android --release --bin platform-app > "$evidence/traces/android-build.log" 2>&1; then error="Dioxus Android build failed"; return 1; fi
  apk=$(find "$catalog/target/dx" -name '*.apk' -type f -print -quit)
  if [ ! -f "$apk" ]; then error="Android APK not found"; return 1; fi
}

if [ "${OPE6_ANDROID_BUILD_ONLY:-false}" = true ]; then
  if ! build_apk; then exit 1; fi
  if [ -z "${GITHUB_ENV:-}" ]; then status=INVALID_EVAL; error="GITHUB_ENV unavailable for APK handoff"; exit 1; fi
  echo "OPE6_ANDROID_APK=$apk" >> "$GITHUB_ENV"
  trap - EXIT
  exit 0
fi

apk=${OPE6_ANDROID_APK:-}
if [ -z "$apk" ]; then
  if ! build_apk; then exit 1; fi
elif [ -f "$apk" ]; then
  printf 'Using prebuilt APK: %s\n' "$apk" >> "$evidence/traces/android-build.log"
else
  error="Prebuilt Android APK unavailable"
  exit 1
fi

if ! command -v adb >/dev/null; then status=INVALID_EVAL; error="adb unavailable"; exit 1; fi
if ! adb get-state >/dev/null 2>&1; then status=INVALID_EVAL; error="Android Emulator unavailable"; exit 1; fi

package=""
analyzer_available=false
if command -v apkanalyzer >/dev/null; then analyzer_available=true; package=$(apkanalyzer manifest application-id "$apk" || true); fi
if [ -z "$package" ] && command -v aapt >/dev/null; then analyzer_available=true; package=$(aapt dump badging "$apk" 2>/dev/null | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -1); fi
if [ -z "$package" ] && [ -n "${ANDROID_HOME:-}" ]; then
  aapt_bin=$(find "$ANDROID_HOME/build-tools" -name aapt -type f | sort -V | tail -1)
  if [ -n "$aapt_bin" ]; then analyzer_available=true; package=$($aapt_bin dump badging "$apk" 2>/dev/null | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -1); fi
fi
if [ "$analyzer_available" != true ]; then status=INVALID_EVAL; error="Android APK analyzer unavailable"; exit 1; fi
if [ -z "$package" ]; then status=FAIL; error="Android package id unavailable"; exit 1; fi
status=FAIL

package_manager_ready=false
for _ in $(seq 1 60); do
  if adb shell cmd package list packages >/dev/null 2>&1; then package_manager_ready=true; break; fi
  sleep 2
done
if [ "$package_manager_ready" != true ]; then status=INVALID_EVAL; error="Android package manager unavailable"; exit 1; fi

install_log="$evidence/traces/android-install.log"
: > "$install_log"
installed=false
for attempt in 1 2 3; do
  if adb install -r "$apk" >> "$install_log" 2>&1; then installed=true; break; fi
  printf 'install attempt %s failed\n' "$attempt" >> "$install_log"
  adb wait-for-device || true
  sleep 5
done
if [ "$installed" != true ]; then
  if grep -Eq 'Broken pipe|device offline|no devices|service package' "$install_log"; then
    status=INVALID_EVAL
    error="Android package-manager transport failed"
  else
    error="Android APK installation failed"
  fi
  exit 1
fi
if ! adb logcat -c; then status=INVALID_EVAL; error="Android logcat unavailable"; exit 1; fi
launch_log="$evidence/traces/android-launch.log"
if ! adb shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 > "$launch_log" 2>&1; then
  if grep -Eq 'No activities found|monkey aborted|Events injected: 0' "$launch_log"; then
    error="Android app launch failed"
  else
    status=INVALID_EVAL
    error="Android launch transport failed"
  fi
  exit 1
fi
if grep -Eq 'No activities found|monkey aborted|Events injected: 0' "$launch_log"; then error="Android app launch failed"; exit 1; fi
marker="PLATFORM_SELF_TEST_PASS surfaces=40 families=5"
marker_observed=false
for _ in $(seq 1 90); do
  if ! adb logcat -d > "$evidence/traces/android-logcat.log"; then status=INVALID_EVAL; error="Android logcat transport failed"; exit 1; fi
  persisted_marker=$(adb shell run-as "$package" cat cache/openui-dioxus-platform.marker 2>/dev/null | tr -d '\r' || true)
  if [ "$persisted_marker" = "$marker" ] || grep -Fq "$marker" "$evidence/traces/android-logcat.log"; then
    printf '%s\n' "$marker" > "$evidence/traces/android-marker.log"
    marker_observed=true
    break
  fi
  sleep 1
done
screenshot="$evidence/screenshots/android-emulator.png"
screenshot_captured=false
screenshot_valid=false
for _ in $(seq 1 10); do
  if adb exec-out screencap -p > "$screenshot"; then
    screenshot_captured=true
    if python3 "$platform/check-screenshot.py" "$screenshot" > "$evidence/traces/android-screenshot.log" 2>&1; then
      screenshot_valid=true
      break
    fi
  fi
  sleep 1
done
if [ "$screenshot_captured" != true ]; then status=INVALID_EVAL; error="Android screenshot capture failed"; exit 1; fi
if [ "$screenshot_valid" != true ]; then status=INVALID_EVAL; error="Android screenshot content invalid"; exit 1; fi
if [ "$marker_observed" != true ]; then
  if grep -Eq 'ANR in com\.android\.(phone|systemui)|System UI.*not responding' "$evidence/traces/android-logcat.log"; then
    status=INVALID_EVAL
    error="Android system image became unresponsive"
  else
    error="runtime marker not observed"
  fi
  exit 1
fi
if [ "$(tr -d '\r\n' < "$evidence/traces/android-marker.log")" != "$marker" ]; then status=INVALID_EVAL; error="Android marker artifact invalid"; exit 1; fi
status=PASS
