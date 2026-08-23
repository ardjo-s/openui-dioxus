use openui_a2ui_cloud_eval::{A2UiAdapter, OpenUiAdapter, ProtocolAdapter};
use serde_json::Value;

fn openui_fixture() -> Value {
    serde_json::from_str(include_str!("../fixtures/reference.openui.oracle.json")).unwrap()
}

fn a2ui_fixture() -> Value {
    serde_json::from_str(include_str!("../fixtures/reference.a2ui.oracle.json")).unwrap()
}

#[test]
fn both_reference_protocols_have_the_same_semantic_fingerprint() {
    let openui = OpenUiAdapter
        .normalize(
            &openui_fixture(),
            include_bytes!("../fixtures/reference.openui"),
        )
        .unwrap();
    let a2ui = A2UiAdapter
        .normalize(
            &a2ui_fixture(),
            include_bytes!("../fixtures/reference.a2ui.json"),
        )
        .unwrap();
    assert_eq!(openui.fingerprint(), a2ui.fingerprint());
    assert_ne!(openui.source_hash, a2ui.source_hash);
}

#[test]
fn a2ui_adapter_rejects_broken_refs_and_unknown_actions() {
    let mut broken = a2ui_fixture();
    broken["resolved"]["components"][6]["properties"]["children"][0] =
        Value::String("missing".into());
    assert!(A2UiAdapter
        .normalize(&broken, b"broken")
        .unwrap_err()
        .to_string()
        .contains("broken component reference"));

    let mut action = a2ui_fixture();
    action["resolved"]["components"][4]["properties"]["action"]["name"] =
        Value::String("DeleteEverything".into());
    assert!(A2UiAdapter
        .normalize(&action, b"bad action")
        .unwrap_err()
        .to_string()
        .contains("unknown action"));
}
