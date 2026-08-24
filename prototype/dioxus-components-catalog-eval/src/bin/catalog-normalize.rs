use std::{env, fs};

use anyhow::{bail, Context};
use dioxus_components_catalog_eval::{CatalogAdapter, DioxusComponentsCatalog};
use serde::Serialize;

#[derive(Serialize)]
struct Normalized<'a> {
    fingerprint: String,
    surface: &'a dioxus_components_catalog_eval::SurfaceRevision,
}

fn main() -> anyhow::Result<()> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.len() != 2 {
        bail!("usage: catalog-normalize <wire-surface.json> <canonical-surface.json>");
    }
    let source = fs::read(&args[0]).with_context(|| format!("read {}", args[0]))?;
    let adapter = DioxusComponentsCatalog::new()?;
    let surface = adapter.normalize(&source)?;
    let normalized = Normalized {
        fingerprint: surface.fingerprint(),
        surface: &surface,
    };
    fs::write(&args[1], serde_json::to_vec_pretty(&normalized)?)
        .with_context(|| format!("write {}", args[1]))?;
    println!("{}", surface.fingerprint());
    Ok(())
}
