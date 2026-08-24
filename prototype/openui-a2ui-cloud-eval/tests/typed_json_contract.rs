use openui_a2ui_cloud_eval::{A2UiAdapter, OpenUiAdapter, ProtocolAdapter, TypedJsonAdapter};
use serde_json::Value;

fn fixture(source: &str) -> Value {
    serde_json::from_str(source).unwrap()
}

#[test]
fn all_three_reference_arms_have_the_same_semantic_fingerprint() {
    let openui = OpenUiAdapter
        .normalize(
            &fixture(include_str!("../fixtures/reference.openui.oracle.json")),
            include_bytes!("../fixtures/reference.openui"),
        )
        .unwrap();
    let a2ui = A2UiAdapter
        .normalize(
            &fixture(include_str!("../fixtures/reference.a2ui.oracle.json")),
            include_bytes!("../fixtures/reference.a2ui.json"),
        )
        .unwrap();
    let typed_json = TypedJsonAdapter
        .normalize(
            &fixture(include_str!("../fixtures/reference.typed-json.oracle.json")),
            include_bytes!("../fixtures/reference.typed-json.json"),
        )
        .unwrap();

    assert_eq!(openui.fingerprint(), a2ui.fingerprint());
    assert_eq!(openui.fingerprint(), typed_json.fingerprint());
    assert_ne!(openui.source_hash, typed_json.source_hash);
}

#[test]
fn typed_json_adapter_rejects_unaccepted_or_duplicate_nodes() {
    let mut rejected = fixture(include_str!("../fixtures/reference.typed-json.oracle.json"));
    rejected["ok"] = Value::Bool(false);
    assert!(TypedJsonAdapter
        .normalize(&rejected, b"rejected")
        .unwrap_err()
        .to_string()
        .contains("did not accept"));

    let mut duplicate = fixture(include_str!("../fixtures/reference.typed-json.oracle.json"));
    let node = duplicate["program"]["nodes"][0].clone();
    duplicate["program"]["nodes"]
        .as_array_mut()
        .unwrap()
        .push(node);
    assert!(TypedJsonAdapter
        .normalize(&duplicate, b"duplicate")
        .unwrap_err()
        .to_string()
        .contains("duplicate component id"));
}
