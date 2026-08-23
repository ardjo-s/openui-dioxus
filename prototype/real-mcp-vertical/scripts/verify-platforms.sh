#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
./scripts/verify-desktop-launch.sh
cargo check --quiet --no-default-features --features desktop
cargo check --quiet --target wasm32-unknown-unknown --no-default-features --features web
cargo check --quiet --no-default-features --features mobile
printf '%s\n' 'platforms: 3/3 PASS'
