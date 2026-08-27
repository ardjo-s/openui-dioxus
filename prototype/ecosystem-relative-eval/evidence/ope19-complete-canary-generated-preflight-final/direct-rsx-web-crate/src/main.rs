mod route_0 {
use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "filter_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "horizontal", "data-orientation": "horizontal", select { id: "role_select", "data-component": "Select", aria_label: "Role · variant 1", "data-state-key": "role_filter", value: "{state_role_filter()}", onchange: move |event| state_role_filter.set(event.value()), option { value: "All", selected: state_role_filter() == "All", "All" }, option { value: "Admin", selected: state_role_filter() == "Admin", "Admin" }, option { value: "Member", selected: state_role_filter() == "Member", "Member" } }, button { id: "filter_button", "data-component": "Button", r#type: "button", "data-action": "ApplyFilter", "data-target-id": "people", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "ApplyFilter", "people")); }, "Apply · variant 1" } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

}

mod route_1 {
use dioxus::prelude::*;

#[allow(non_snake_case)]
pub fn App() -> Element {
    let mut state_dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| "ready".to_string());
    rsx! {
        main { "data-route": "direct-rsx", div { id: "progress_toolbar", "data-component": "Toolbar", role: "toolbar", aria_label: "Generated interface", aria_orientation: "vertical", "data-orientation": "vertical", section { id: "sync_dialog", "data-component": "Dialog", role: "dialog", aria_label: "Syncing workspace · variant 1", "data-state-key": "dialog_open", "data-open": "{state_dialog_open()}", h2 { "Syncing workspace · variant 1" }, progress { id: "sync_progress", "data-component": "Progress", aria_label: "Sync progress · variant 1", value: "20", max: "100" }, button { id: "sync_button", "data-component": "Button", r#type: "button", "data-action": "ApplyFilter", "data-target-id": "sync", onclick: move |_| { action_count.with_mut(|count| *count += 1); receipt.set(format!("receipt:{}:{}", "ApplyFilter", "sync")); }, "Acknowledge sync · variant 1" } } }, p { role: "status", aria_live: "polite", "data-action-count": "{action_count()}", "data-receipt": "{receipt()}", "{receipt()}" } }
    }
}

}

use dioxus::prelude::*;

#[allow(non_snake_case)]
fn Root() -> Element {
    let mut current = use_signal(|| 0usize);
    let index = current().min(1);
    let content = match index {
        0 => rsx! { route_0::App {} },
        1 => rsx! { route_1::App {} },
        _ => unreachable!(),
    };
    let scenario_id = match index {
        0 => "03-filter-action-v1",
        1 => "04-status-dialog-v1",
        _ => unreachable!(),
    };
    let schedule_scenario_id = match index {
        0 => "compile-03-filter-action-v1",
        1 => "compile-04-status-dialog-v1",
        _ => unreachable!(),
    };
    let cohort = match index {
        0 => "compile-known",
        1 => "compile-known",
        _ => unreachable!(),
    };
    rsx! {
        document::Script { "document.documentElement.lang = 'en';" }
        div {
            id: "ope11-direct-rsx-root",
            style: "max-width: 860px; margin: 72px auto; padding: 24px; background: #d1d5db; border-radius: 12px; font-family: system-ui, sans-serif;",
            "data-manifest-hash": "1973db76a604ed0e4378e0fc0e0775be8f29e9cc8ba957599a0c17870bd4a3e3",
            "data-binding-sha256": "ea7f2fb941fb20935aaca0a43c91631ce11dfe577becf67cf6a47e57c85b36eb",
            "data-surface-count": "2",
            "data-current-index": "{index}",
            section { style: "min-height: 260px; padding: 24px; background: white; border-radius: 8px;", "data-scenario-id": "{scenario_id}", "data-schedule-scenario-id": "{schedule_scenario_id}", "data-cohort": "{cohort}", {content} }
            nav { style: "margin-top: 16px;", aria_label: "Direct RSX navigation",
                button { r#type: "button", disabled: index == 0, onclick: move |_| current.set(index.saturating_sub(1)), "Previous Source" }
                button { r#type: "button", disabled: index + 1 >= 2, onclick: move |_| current.set((index + 1).min(1)), "Next Source" }
            }
        }
    }
}

fn main() { dioxus::launch(Root); }
