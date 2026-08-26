#[cfg(feature = "ssr")]
use std::{collections::BTreeMap, fs, path::PathBuf};

#[cfg(feature = "ssr")]
use dioxus_components_catalog_eval::{ui::render_surface, CatalogAdapter, DioxusComponentsCatalog};

#[cfg(feature = "ssr")]
fn main() {
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/workflows");
    let adapter = DioxusComponentsCatalog::new().expect("catalog");
    let rendered = [
        "01-profile",
        "02-preferences",
        "03-filter",
        "04-progress-dialog",
        "05-tabs-feedback",
    ]
    .into_iter()
    .map(|name| {
        let source = fs::read(fixtures.join(format!("{name}.json"))).expect("fixture");
        let surface = adapter.normalize(&source).expect("surface");
        let body = dioxus_ssr::render_element(render_surface(surface));
        (
            name,
            format!(
                "<main data-route=\"dioxus\">{body}<p role=\"status\" aria-live=\"polite\" data-receipt=\"ready\">ready</p></main>"
            ),
        )
    })
    .collect::<BTreeMap<_, _>>();
    println!(
        "{}",
        serde_json::to_string(&rendered).expect("rendered JSON")
    );
}

#[cfg(not(feature = "ssr"))]
fn main() {}
