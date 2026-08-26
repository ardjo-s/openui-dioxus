use std::collections::BTreeSet;

use ope11_dioxus_canary::{load_entries, render_entry_html, run_contract};

#[test]
fn two_runtime_routes_cross_the_real_dioxus_probe() {
    let entries = load_entries().unwrap();
    assert_eq!(entries.len(), 2);
    assert_eq!(
        entries
            .iter()
            .map(|entry| entry.route.as_str())
            .collect::<BTreeSet<_>>(),
        BTreeSet::from(["openui", "typed-json"]),
    );
    for entry in entries {
        assert!(run_contract(&entry).unwrap().complete);
        let html = render_entry_html(&entry);
        assert!(html.contains("data-component"));
        assert!(html.contains(&entry.scenario_id));
    }
}
