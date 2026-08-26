use std::{env, fs, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=OPE11_DIOXUS_FIXTURE_PATH");
    let manifest = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let source = env::var_os("OPE11_DIOXUS_FIXTURE_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|| manifest.join("../fixtures/dioxus-surfaces.json"));
    println!("cargo:rerun-if-changed={}", source.display());
    let output = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR")).join("ope11-dioxus-surfaces.json");
    fs::copy(&source, &output).unwrap_or_else(|error| {
        panic!("copy OPE11 fixture {}: {error}", source.display());
    });
}
