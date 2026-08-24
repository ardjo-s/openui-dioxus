use std::{fs, path::PathBuf};

use dioxus_components_catalog_eval::{
    CatalogAdapter, DioxusComponentsCatalog, EventInput, ThinCatalog,
};
use serde_json::Value;

fn fixture_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/workflows")
}

#[test]
fn duplicate_state_bindings_are_rejected_before_rendering() {
    let mut fixture: Value =
        serde_json::from_slice(&fs::read(fixture_dir().join("02-preferences.json")).unwrap())
            .unwrap();
    fixture["nodes"][0]["children"]
        .as_array_mut()
        .unwrap()
        .push(Value::String("duplicate_switch".into()));
    fixture["nodes"]
        .as_array_mut()
        .unwrap()
        .push(serde_json::json!({
            "kind": "Switch",
            "id": "duplicate_switch",
            "label": "Duplicate notifications",
            "state_key": "notifications_enabled",
            "checked": true
        }));

    let error = DioxusComponentsCatalog::new()
        .unwrap()
        .normalize(&serde_json::to_vec(&fixture).unwrap())
        .unwrap_err();
    assert!(
        error.to_string().contains("bound more than once"),
        "{error}"
    );
}

#[test]
fn a_distinct_thin_catalog_preserves_surface_and_event_semantics() {
    let source = fs::read(fixture_dir().join("03-filter.json")).unwrap();
    let dioxus = DioxusComponentsCatalog::new().unwrap();
    let thin = ThinCatalog::new().unwrap();
    let dioxus_surface = dioxus.normalize(&source).unwrap();
    let thin_surface = thin.normalize(&source).unwrap();

    assert_ne!(dioxus.catalog_id(), thin.catalog_id());
    assert_ne!(
        dioxus_surface.catalog_release_hash,
        thin_surface.catalog_release_hash
    );
    assert_eq!(dioxus_surface.fingerprint(), thin_surface.fingerprint());
    assert_eq!(
        dioxus
            .event(&dioxus_surface, "filter_button", EventInput::Activate)
            .unwrap(),
        thin.event(&thin_surface, "filter_button", EventInput::Activate)
            .unwrap(),
    );
}

#[test]
fn a_label_with_a_broken_control_reference_is_rejected() {
    let mut fixture: Value =
        serde_json::from_slice(&fs::read(fixture_dir().join("01-profile.json")).unwrap()).unwrap();
    fixture["nodes"][2]["for_id"] = Value::String("missing_input".into());

    let error = DioxusComponentsCatalog::new()
        .unwrap()
        .normalize(&serde_json::to_vec(&fixture).unwrap())
        .unwrap_err();
    assert!(
        error.to_string().contains("broken component reference"),
        "{error}"
    );
}

#[test]
fn five_reference_workflows_have_frozen_fingerprints() {
    let expected: Value = serde_json::from_slice(
        &fs::read(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("fixtures/fingerprints.json"))
            .unwrap(),
    )
    .unwrap();
    let adapter = DioxusComponentsCatalog::new().unwrap();

    for name in [
        "01-profile",
        "02-preferences",
        "03-filter",
        "04-progress-dialog",
        "05-tabs-feedback",
    ] {
        let source = fs::read(fixture_dir().join(format!("{name}.json"))).unwrap();
        let surface = adapter.normalize(&source).unwrap();
        assert_eq!(surface.fingerprint(), expected[name], "{name}");
    }
}
