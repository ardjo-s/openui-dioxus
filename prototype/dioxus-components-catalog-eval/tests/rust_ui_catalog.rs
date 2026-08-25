use std::{fs, path::PathBuf};

use dioxus_components_catalog_eval::{
    catalog_evidence::{copy_on_write_migrate, inert_replay},
    CatalogAdapter, EventInput, RustUiCatalog, TypedEvent,
};

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
fn every_declared_rust_ui_event_has_an_executable_adapter_route() {
    let manifest: serde_json::Value = serde_json::from_slice(
        &fs::read(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("catalog/rust-ui-manifest.json"))
            .unwrap(),
    )
    .unwrap();
    let declared = manifest["components"]
        .as_array()
        .unwrap()
        .iter()
        .map(|component| {
            (
                component["name"].as_str().unwrap(),
                component["events"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|event| event["name"].as_str().unwrap())
                    .collect::<Vec<_>>(),
            )
        })
        .collect::<std::collections::BTreeMap<_, _>>();
    assert_eq!(declared["Input"], ["FieldChanged"]);
    assert_eq!(declared["Checkbox"], ["ToggleChanged"]);
    assert_eq!(declared["Button"], ["ActionInvoked"]);
    for kind in ["Label", "Card", "Table", "Progress", "Alert"] {
        assert!(
            declared[kind].is_empty(),
            "{kind} declares an unsupported event"
        );
    }

    let adapter = RustUiCatalog::new().unwrap();
    let surface = adapter.normalize(&fixture("01-profile-submit")).unwrap();
    assert!(matches!(
        adapter
            .event(
                &surface,
                "name",
                EventInput::String {
                    value: "Lin".into()
                }
            )
            .unwrap(),
        TypedEvent::FieldChanged { .. }
    ));
    assert!(matches!(
        adapter
            .event(&surface, "terms", EventInput::Boolean { value: false })
            .unwrap(),
        TypedEvent::ToggleChanged { .. }
    ));
    assert!(matches!(
        adapter
            .event(&surface, "submit", EventInput::Activate)
            .unwrap(),
        TypedEvent::ActionInvoked { .. }
    ));
}

#[test]
fn rust_ui_table_rejects_rows_that_do_not_match_the_declared_columns() {
    let adapter = RustUiCatalog::new().unwrap();
    let mut source: serde_json::Value =
        serde_json::from_slice(&fixture("01-profile-submit")).unwrap();
    let table = source["nodes"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|node| node["kind"] == "Table")
        .unwrap();
    table["rows"][0]["cells"].as_array_mut().unwrap().pop();

    let error = adapter
        .normalize(&serde_json::to_vec(&source).unwrap())
        .unwrap_err();
    assert!(error.to_string().contains("Table row"));
}

#[test]
fn rust_ui_replay_is_inert_and_identity_exact() {
    let adapter = RustUiCatalog::new().unwrap();
    let source = fixture("01-profile-submit");
    let first = adapter.normalize(&source).unwrap();
    let replay = inert_replay(&adapter, &source).unwrap();
    assert_eq!(first, replay);
    assert_eq!(first.fingerprint(), replay.fingerprint());
    assert_eq!(first.catalog_release_hash, replay.catalog_release_hash);
    assert!(!adapter.adapter_build_id().is_empty());
}

#[test]
fn catalog_evidence_code_has_no_effect_capability() {
    let evidence = include_str!("../src/catalog_evidence.rs");
    let adapter = include_str!("../src/rust_ui.rs");
    for forbidden in [
        "reqwest",
        "std::net",
        "Command::",
        "use_effect",
        "navigator",
        "web_sys",
        "tokio::net",
    ] {
        assert!(
            !evidence.contains(forbidden),
            "evidence imports {forbidden}"
        );
        assert!(!adapter.contains(forbidden), "adapter imports {forbidden}");
    }
}

#[test]
fn migration_is_copy_on_write_and_pins_both_compatibility_identities() {
    let adapter = RustUiCatalog::new().unwrap();
    let source = adapter.normalize(&fixture("01-profile-submit")).unwrap();
    let source_snapshot = source.clone();
    let target_release = "sha256:ope10-drill-target";
    let (target, receipt) =
        copy_on_write_migrate(&source, &source.catalog_release_hash, target_release).unwrap();
    assert_eq!(source, source_snapshot);
    assert!(receipt.source_preserved);
    assert_eq!(receipt.source_release_hash, source.catalog_release_hash);
    assert_eq!(receipt.target_release_hash, target_release);
    assert_eq!(receipt.source_fingerprint, receipt.target_fingerprint);
    assert_eq!(target.catalog_release_hash, target_release);
}

#[test]
fn shared_platform_behavior_contract_is_target_neutral() {
    let adapter = RustUiCatalog::new().unwrap();
    let source = fixture("02-preferences-review");
    let surface = inert_replay(&adapter, &source).unwrap();
    let event = adapter
        .event(&surface, "submit", EventInput::Activate)
        .unwrap();
    assert!(matches!(event, TypedEvent::ActionInvoked { .. }));
    assert_eq!(surface.nodes.len(), 8);
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
        "Button", "Input", "Label", "Checkbox", "Card", "Alert", "Progress", "Table",
    ] {
        assert!(
            html.contains(&format!("data-component=\"{component}\"")),
            "{component}"
        );
    }
    assert!(html.contains("role=\"checkbox\""));
    assert!(html.contains("aria-checked=\"true\""));

    for id in [
        "profile",
        "name-label",
        "name",
        "terms",
        "submit",
        "review-table",
        "progress",
        "feedback",
    ] {
        assert!(html.contains(&format!("id=\"{id}\"")), "stable id {id}");
    }
    assert!(html.contains("<table id=\"review-table\""));
    assert!(html.contains("<caption"));
    assert!(html.contains("Preference review"));
    assert!(html.contains("role=\"progressbar\""));
    assert!(html.contains("aria-label=\"Preferences complete\""));
    assert!(html.contains("role=\"alert\""));
}
