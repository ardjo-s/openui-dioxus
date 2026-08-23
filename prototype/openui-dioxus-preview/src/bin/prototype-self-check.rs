use openui_dioxus_preview::{Runtime, TypedAction};

const VALID: &str = include_str!("../../fixtures/valid-proposal.ui");
const INVALID: &str = include_str!("../../fixtures/invalid-proposal.ui");

fn main() {
    let mut runtime = Runtime::new();

    let denied_before_commit = runtime.invoke(TypedAction::ApproveExpense).is_err();
    runtime.propose(VALID).expect("valid fixture must commit");
    let live = runtime
        .set_field("merchant_field", "Acme Corp")
        .expect("fixture field must update");
    let catalog_pass = catalog_kinds(&live) == 8 && live.nodes.len() == 10;
    let before_invalid = live.semantic_fingerprint();
    let before_effects = runtime.effect_count();
    let rejected = runtime.propose(INVALID).is_err();
    let unchanged = runtime
        .projection()
        .map(|projection| projection.semantic_fingerprint() == before_invalid)
        .unwrap_or(false)
        && runtime.effect_count() == before_effects;
    let receipt = runtime
        .invoke(TypedAction::ApproveExpense)
        .expect("committed action must receipt");
    let typed_action_pass = denied_before_commit
        && receipt.action == TypedAction::ApproveExpense
        && runtime.effect_count() == 1;
    let checkpoint = runtime
        .checkpoint()
        .expect("accepted surface has checkpoint");
    let replay = runtime.replay(&checkpoint).expect("checkpoint must replay");
    let replay_pass = replay.is_inert()
        && replay.semantic_fingerprint() == before_invalid
        && runtime.effect_count() == 1;

    println!(
        "parse_commit: {}",
        if live.root == "screen" {
            "PASS"
        } else {
            "FAIL"
        }
    );
    println!(
        "atomic_reject: {}",
        if rejected && unchanged {
            "PASS"
        } else {
            "FAIL"
        }
    );
    println!(
        "catalog: {}/8 {}",
        catalog_kinds(&live),
        if catalog_pass { "PASS" } else { "FAIL" }
    );
    println!(
        "typed_action: {}",
        if typed_action_pass { "PASS" } else { "FAIL" }
    );
    println!("replay: {}", if replay_pass { "PASS" } else { "FAIL" });
    let passes = [
        live.root == "screen",
        rejected && unchanged,
        catalog_pass,
        typed_action_pass,
        replay_pass,
    ]
    .into_iter()
    .filter(|pass| *pass)
    .count();
    println!("summary: {passes}/5 PASS");
    assert_eq!(passes, 5, "prototype self-check failed");
}

fn catalog_kinds(projection: &openui_dioxus_preview::Projection) -> usize {
    let mut kinds = std::collections::BTreeSet::new();
    for node in &projection.nodes {
        kinds.insert(match node {
            openui_dioxus_preview::Node::Text { .. } => "Text",
            openui_dioxus_preview::Node::Stack { .. } => "Stack",
            openui_dioxus_preview::Node::Card { .. } => "Card",
            openui_dioxus_preview::Node::Table { .. } => "Table",
            openui_dioxus_preview::Node::Input { .. } => "Input",
            openui_dioxus_preview::Node::Select { .. } => "Select",
            openui_dioxus_preview::Node::Button { .. } => "Button",
            openui_dioxus_preview::Node::Alert { .. } => "Alert",
        });
    }
    kinds.len()
}
