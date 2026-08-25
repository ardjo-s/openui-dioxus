use std::{fs, path::PathBuf};

use dioxus_components_catalog_eval::{CatalogAdapter, EventInput, RustUiCatalog, TypedEvent};

fn fixture(name: &str) -> Vec<u8> {
    let fixtures: serde_json::Value = serde_json::from_slice(
        &fs::read(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("generated-rust-ui/workflow-fixtures.json"),
        )
        .unwrap(),
    )
    .unwrap();
    serde_json::to_vec(&fixtures[name]).unwrap()
}

#[test]
fn rust_ui_catalog_normalizes_two_complete_workflows() {
    let adapter = RustUiCatalog::new().unwrap();
    for name in ["01-profile-submit", "02-preferences-review"] {
        let surface = adapter.normalize(&fixture(name)).unwrap();
        assert_eq!(surface.catalog_id, "rust-ui-dioxus-eval");
        assert!(!surface.catalog_release_hash.is_empty());
        assert_eq!(surface.nodes.len(), 8);
    }
}

#[test]
fn rust_ui_catalog_emits_the_typed_host_action() {
    let adapter = RustUiCatalog::new().unwrap();
    let surface = adapter.normalize(&fixture("01-profile-submit")).unwrap();
    assert_eq!(
        adapter
            .event(&surface, "submit", EventInput::Activate)
            .unwrap(),
        TypedEvent::ActionInvoked {
            action: "submit_profile".into(),
            target_id: "profile".into(),
        }
    );
}

#[test]
fn rust_ui_replay_is_inert_and_identity_exact() {
    let adapter = RustUiCatalog::new().unwrap();
    let source = fixture("01-profile-submit");
    let first = adapter.normalize(&source).unwrap();
    let replay = adapter.normalize(&source).unwrap();
    assert_eq!(first, replay);
    assert_eq!(first.fingerprint(), replay.fingerprint());
    assert_eq!(first.catalog_release_hash, replay.catalog_release_hash);
    assert_eq!(adapter.adapter_build_id(), adapter.adapter_build_id());
}

#[cfg(feature = "ssr")]
#[test]
fn rust_ui_components_compile_and_render_through_the_static_adapter() {
    let adapter = RustUiCatalog::new().unwrap();
    let surface = adapter
        .normalize(&fixture("02-preferences-review"))
        .unwrap();
    let html = dioxus_ssr::render_element(dioxus_components_catalog_eval::rust_ui::render_surface(
        surface,
    ));
    for component in [
        "Button", "Input", "Label", "Checkbox", "Card", "Alert", "Progress", "Tabs",
    ] {
        assert!(
            html.contains(&format!("data-component=\"{component}\"")),
            "{component}"
        );
    }
    assert!(html.contains("role=\"checkbox\""));
    assert!(html.contains("aria-checked=\"true\""));
}
