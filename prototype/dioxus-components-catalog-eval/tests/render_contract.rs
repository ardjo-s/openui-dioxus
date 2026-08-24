#![cfg(feature = "ssr")]

use std::{fs, path::PathBuf};

use dioxus_components_catalog_eval::{
    ui::{render_surface, upstream_bindings},
    CatalogAdapter, DioxusComponentsCatalog,
};

#[test]
fn all_twelve_components_render_through_pinned_dioxus_bindings() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/workflows");
    let adapter = DioxusComponentsCatalog::new().unwrap();
    let mut html = String::new();

    for name in [
        "01-profile",
        "02-preferences",
        "03-filter",
        "04-progress-dialog",
        "05-tabs-feedback",
    ] {
        let surface = adapter
            .normalize(&fs::read(root.join(format!("{name}.json"))).unwrap())
            .unwrap();
        html.push_str(&dioxus_ssr::render_element(render_surface(surface)));
    }

    for component in [
        "Label", "Toolbar", "Avatar", "Input", "Select", "Checkbox", "Switch", "Button", "Tabs",
        "Dialog", "Progress", "Toast",
    ] {
        assert!(
            html.contains(&format!("data-component=\"{component}\"")),
            "missing {component}: {html}"
        );
    }
    assert_eq!(upstream_bindings().len(), 12);
    assert!(html.contains("data-upstream-source=\"preview::components::input::Input\""));
    assert!(html.contains("data-upstream-source=\"preview::components::button::Button\""));
}
