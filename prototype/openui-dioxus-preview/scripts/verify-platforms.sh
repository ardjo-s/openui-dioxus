#!/bin/sh
set -eu

cargo check --no-default-features --features desktop
cargo check --target wasm32-unknown-unknown --no-default-features --features web
cargo check --no-default-features --features mobile

printf '%s\n' 'platforms: 3/3 PASS'
