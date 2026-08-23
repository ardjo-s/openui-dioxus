use std::{env, fs};

use anyhow::Context;
use dioxus::prelude::*;
use openui_a2ui_cloud_eval::{catalog::StaticSurface, Surface};

fn main() -> anyhow::Result<()> {
    let path = env::args().nth(1).context("missing Surface JSON path")?;
    let surface: Surface = serde_json::from_slice(&fs::read(path)?)?;
    let fingerprint = surface.fingerprint();
    let html = dioxus_ssr::render_element(rsx! { StaticSurface { surface } });
    let has_all_components = [
        "Text", "Stack", "Card", "Table", "Input", "Select", "Button", "Alert",
    ]
    .iter()
    .all(|kind| html.contains(&format!("data-component=\"{kind}\"")));
    println!(
        "{}",
        serde_json::json!({
            "fingerprint": fingerprint,
            "html_bytes": html.len(),
            "has_all_components": has_all_components
        })
    );
    Ok(())
}
