use std::collections::BTreeMap;

use openui_a2ui_cloud_eval::{Protocol, Surface, TypedNode};

#[test]
fn canonical_surface_rejects_more_than_sixty_four_nodes() {
    let nodes = (0..65)
        .map(|index| {
            let id = format!("node-{index}");
            (
                id.clone(),
                TypedNode::Text {
                    id,
                    text: "bounded".into(),
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    let error = Surface::new(Protocol::OpenUi, "node-0".into(), nodes, b"source")
        .expect_err("65 nodes must exceed the execution boundary");
    assert!(error.to_string().contains("node count"));
}

#[test]
fn canonical_surface_rejects_more_than_two_hundred_fifty_six_kibibytes() {
    let id = "root".to_owned();
    let nodes = BTreeMap::from([(
        id.clone(),
        TypedNode::Text {
            id: id.clone(),
            text: "bounded".into(),
        },
    )]);
    let source = vec![b'x'; 256 * 1024 + 1];

    let error = Surface::new(Protocol::OpenUi, id, nodes, &source)
        .expect_err("oversized source must be rejected before execution");
    assert!(error.to_string().contains("source exceeds"));
}
