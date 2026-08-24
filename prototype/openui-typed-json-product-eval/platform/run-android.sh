#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
catalog="$repo_root/prototype/dioxus-components-catalog-eval"
platform="$repo_root/prototype/openui-typed-json-product-eval/platform"
evidence=${OPE6_EVIDENCE_DIR:-$platform/evidence/platform-android}
dx_bin=${DIOXUS_CLI_BIN:-$(command -v dx)}
mkdir -p "$evidence/screenshots" "$evidence/traces"
result="$evidence/android.json"
status=INVALID_EVAL
error=""

finish() {
  jq -n --arg status "$status" --arg error "$error" \
    '{platform:"android",status:$status,passed:($status == "PASS"),evidence_complete:($status == "PASS"),surfaces:40,families:5,error:(if $error == "" then null else $error end)}' > "$result"
}
trap finish EXIT

if ! command -v adb >/dev/null; then error="adb unavailable"; exit 1; fi
if ! adb get-state >/dev/null 2>&1; then error="Android Emulator unavailable"; exit 1; fi
status=FAIL
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

cd "$catalog"
if ! "$dx_bin" build --platform android --release --bin platform-app > "$evidence/traces/android-build.log" 2>&1; then error="Dioxus Android build failed"; exit 1; fi
apk=$(find "$catalog/target/dx" -name '*.apk' -type f | head -1)
if [ -z "$apk" ]; then error="Android APK not found"; exit 1; fi
package=""
if command -v apkanalyzer >/dev/null; then package=$(apkanalyzer manifest application-id "$apk"); fi
if [ -z "$package" ] && command -v aapt >/dev/null; then package=$(aapt dump badging "$apk" | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -1); fi
if [ -z "$package" ] && [ -n "${ANDROID_HOME:-}" ]; then
  aapt_bin=$(find "$ANDROID_HOME/build-tools" -name aapt -type f | sort -V | tail -1)
  if [ -n "$aapt_bin" ]; then package=$($aapt_bin dump badging "$apk" | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -1); fi
fi
if [ -z "$package" ]; then error="Android package id unavailable"; exit 1; fi

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
adb shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 > "$evidence/traces/android-launch.log"
marker="PLATFORM_SELF_TEST_PASS surfaces=40 families=5"
for _ in $(seq 1 90); do
  adb logcat -d > "$evidence/traces/android-logcat.log"
  if grep -q "$marker" "$evidence/traces/android-logcat.log"; then status=PASS; break; fi
  sleep 1
done
adb exec-out screencap -p > "$evidence/screenshots/android-emulator.png"
if [ "$status" != PASS ]; then error="runtime marker not observed"; exit 1; fi
if [ ! -s "$evidence/screenshots/android-emulator.png" ]; then status=INVALID_EVAL; error="Android screenshot missing"; exit 1; fi
dimensions=$(python3 -c 'import struct,sys; data=open(sys.argv[1],"rb").read(24); print(*struct.unpack(">II",data[16:24]))' "$evidence/screenshots/android-emulator.png")
width=${dimensions%% *}
height=${dimensions##* }
if [ "$width" -lt 320 ] || [ "$height" -lt 240 ]; then status=INVALID_EVAL; error="Android screenshot dimensions invalid"; exit 1; fi
