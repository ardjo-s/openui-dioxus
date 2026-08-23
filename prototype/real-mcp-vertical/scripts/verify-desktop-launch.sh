#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
marker="${TMPDIR:-/tmp}/openui-dioxus-desktop-live-$$.txt"
rm -f "$marker"
OPENUI_DIOXUS_LAUNCH_EVIDENCE="$marker" cargo run --quiet --no-default-features --features desktop &
pid=$!
cleanup() {
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  rm -f "$marker"
}
trap cleanup EXIT INT TERM
i=0
while [ "$i" -lt 30 ]; do
  if [ -s "$marker" ]; then
    cat "$marker"
    exit 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "desktop_live: FAIL app exited before marker" >&2
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done
echo "desktop_live: FAIL launch timeout" >&2
exit 1
