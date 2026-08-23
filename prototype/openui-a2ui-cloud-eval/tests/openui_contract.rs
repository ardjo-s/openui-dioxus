use openui_a2ui_cloud_eval::{
    ActionInvocation, OpenUiAdapter, ProtocolAdapter, Runtime, TypedNode,
};
use serde_json::Value;

fn oracle_fixture() -> Value {
    serde_json::from_str(include_str!("../fixtures/reference.openui.oracle.json"))
        .expect("checked-in official OpenUI oracle fixture")
}

#[test]
fn official_openui_ast_normalizes_the_eight_component_catalog() {
    let surface = OpenUiAdapter
        .normalize(
            &oracle_fixture(),
            include_bytes!("../fixtures/reference.openui"),
        )
        .expect("reference fixture should normalize");

    let mut kinds = surface
        .nodes
        .values()
        .map(TypedNode::kind)
        .collect::<Vec<_>>();
    kinds.sort_unstable();
    kinds.dedup();
    assert_eq!(
        kinds,
        vec!["Alert", "Button", "Card", "Input", "Select", "Stack", "Table", "Text"]
    );
    assert_eq!(surface.nodes.len(), 8);
    assert_eq!(surface.fields["review_note"], "");
    assert_eq!(surface.fields["status_filter"], "pending");
}

#[test]
fn runtime_preserves_state_executes_once_and_replays_inertly() {
    let surface = OpenUiAdapter
        .normalize(
            &oracle_fixture(),
            include_bytes!("../fixtures/reference.openui"),
        )
        .expect("reference fixture should normalize");
    let mut runtime = Runtime::new(surface);

    runtime.set_field("review_note", "Looks correct").unwrap();
    runtime.set_field("status_filter", "all").unwrap();
    let invocation = ActionInvocation {
        invocation_id: "invoke-exp-001".into(),
        action: "ApproveExpense".into(),
        expense_id: "exp-001".into(),
    };
    let first = runtime.invoke(invocation.clone()).unwrap();
    let duplicate = runtime.invoke(invocation).unwrap();
    assert_eq!(first, duplicate);
    assert_eq!(runtime.effect_count(), 1);

    let snapshot = runtime.snapshot();
    let replay = snapshot.replay().unwrap();
    assert_eq!(replay.fingerprint, runtime.surface().fingerprint());
    assert_eq!(replay.state["review_note"], "Looks correct");
    assert_eq!(replay.state["status_filter"], "all");
    assert_eq!(replay.effect_count, 0);
}

#[test]
fn malformed_oracle_payloads_are_rejected() {
    let mut unknown_action = oracle_fixture();
    let action = unknown_action
        .pointer_mut("/parse/root/props/child/props/children/4/props/action/name")
        .expect("fixture action path");
    *action = Value::String("DeleteEverything".into());
    assert!(OpenUiAdapter
        .normalize(&unknown_action, b"unknown action")
        .unwrap_err()
        .to_string()
        .contains("unknown action"));

    let mut unresolved = oracle_fixture();
    unresolved["parse"]["meta"]["unresolved"] = serde_json::json!(["missing"]);
    assert!(OpenUiAdapter
        .normalize(&unresolved, b"broken ref")
        .unwrap_err()
        .to_string()
        .contains("unresolved"));
}
