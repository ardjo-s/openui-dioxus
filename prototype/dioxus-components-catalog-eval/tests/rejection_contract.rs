use std::{fs, path::PathBuf};

use dioxus_components_catalog_eval::{CatalogAdapter, DioxusComponentsCatalog, EventInput};
use serde_json::{json, Value};

fn fixture(name: &str) -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures/workflows")
        .join(name);
    serde_json::from_slice(&fs::read(path).unwrap()).unwrap()
}

fn rejected(value: &Value) {
    let adapter = DioxusComponentsCatalog::new().unwrap();
    assert!(adapter
        .normalize(&serde_json::to_vec(value).unwrap())
        .is_err());
}

#[test]
fn malformed_catalog_inputs_are_rejected_before_rendering() {
    let mut unknown_top = fixture("01-profile.json");
    unknown_top["surprise"] = json!(true);
    rejected(&unknown_top);

    let mut unknown_component = fixture("01-profile.json");
    unknown_component["nodes"][1]["kind"] = json!("MagicAvatar");
    rejected(&unknown_component);

    let mut unknown_prop = fixture("01-profile.json");
    unknown_prop["nodes"][1]["magic"] = json!(true);
    rejected(&unknown_prop);

    let mut unknown_state = fixture("01-profile.json");
    unknown_state["state"]["ambient_secret"] = json!("no");
    rejected(&unknown_state);

    let mut unknown_action = fixture("01-profile.json");
    unknown_action["nodes"][4]["action"] = json!("DeleteEverything");
    rejected(&unknown_action);

    let mut broken_reference = fixture("01-profile.json");
    broken_reference["nodes"][0]["children"][0] = json!("missing");
    rejected(&broken_reference);

    let mut duplicate_id = fixture("01-profile.json");
    duplicate_id["nodes"][1]["id"] = json!("name_label");
    rejected(&duplicate_id);

    let mut wrong_root = fixture("01-profile.json");
    wrong_root["root"] = json!("profile_avatar");
    rejected(&wrong_root);

    let mut nested_extra = fixture("05-tabs-feedback.json");
    nested_extra["nodes"][1]["items"][0]["surprise"] = json!(true);
    rejected(&nested_extra);
}

#[test]
fn undeclared_or_mistyped_events_are_rejected() {
    let adapter = DioxusComponentsCatalog::new().unwrap();
    let surface = adapter
        .normalize(&serde_json::to_vec(&fixture("01-profile.json")).unwrap())
        .unwrap();

    assert!(adapter
        .event(
            &surface,
            "submit_button",
            EventInput::String {
                value: "wrong".into()
            },
        )
        .is_err());
    assert!(adapter
        .event(&surface, "name_label", EventInput::Activate)
        .is_err());
}

#[test]
fn semantic_references_do_not_hide_unreachable_nodes_and_cycles_are_rejected() {
    let mut unreachable = fixture("01-profile.json");
    unreachable["nodes"][0]["children"] = json!(["profile_avatar", "name_label", "submit_button"]);
    let error = DioxusComponentsCatalog::new()
        .unwrap()
        .normalize(&serde_json::to_vec(&unreachable).unwrap())
        .unwrap_err();
    assert!(
        error.to_string().contains("exactly one declared root"),
        "{error}"
    );

    let mut cycle = fixture("01-profile.json");
    cycle["nodes"][0]["children"]
        .as_array_mut()
        .unwrap()
        .push(json!("cycle_toolbar"));
    cycle["nodes"].as_array_mut().unwrap().push(json!({
        "kind": "Toolbar",
        "id": "cycle_toolbar",
        "orientation": "vertical",
        "children": ["cycle_toolbar"]
    }));
    let error = DioxusComponentsCatalog::new()
        .unwrap()
        .normalize(&serde_json::to_vec(&cycle).unwrap())
        .unwrap_err();
    assert!(error.to_string().contains("cycle"), "{error}");
}

#[test]
fn selection_events_cannot_escape_declared_options() {
    let adapter = DioxusComponentsCatalog::new().unwrap();
    let select_surface = adapter
        .normalize(&serde_json::to_vec(&fixture("03-filter.json")).unwrap())
        .unwrap();
    assert!(adapter
        .event(
            &select_surface,
            "role_select",
            EventInput::String {
                value: "SuperAdmin".into(),
            },
        )
        .is_err());

    let tabs_surface = adapter
        .normalize(&serde_json::to_vec(&fixture("05-tabs-feedback.json")).unwrap())
        .unwrap();
    assert!(adapter
        .event(
            &tabs_surface,
            "account_tabs",
            EventInput::String {
                value: "hidden".into(),
            },
        )
        .is_err());
}

#[test]
fn tab_values_and_label_targets_obey_component_semantics() {
    let mut tabs = fixture("05-tabs-feedback.json");
    tabs["nodes"][1]["items"]
        .as_array_mut()
        .unwrap()
        .push(json!({
            "value": "activity",
            "label": "Duplicate activity",
            "child": "saved_toast"
        }));
    rejected(&tabs);

    let mut label = fixture("01-profile.json");
    label["nodes"][2]["for_id"] = json!("profile_avatar");
    rejected(&label);
}
