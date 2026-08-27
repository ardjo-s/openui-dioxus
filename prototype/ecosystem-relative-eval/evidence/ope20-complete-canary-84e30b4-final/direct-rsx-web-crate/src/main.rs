mod route_0 {
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(String::new);

    rsx! {
        main {
            id: "filter_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-label": "Filter actions",
            "aria-orientation": "horizontal",

            label {
                r#for: "role_select",
                "Role · variant 1"
            }

            select {
                id: "role_select",
                "data-component": "Select",
                value: "{role_filter}",
                onchange: move |event| role_filter.set(event.value()),

                option { value: "All", "All" }
                option { value: "Admin", "Admin" }
                option { value: "Member", "Member" }
            }

            button {
                id: "filter_button",
                "data-component": "Button",
                "data-action": "ApplyFilter",
                "data-target-id": "people",
                onclick: move |_| {
                    action_count += 1;
                    receipt.set("receipt:ApplyFilter:people".to_string());
                },
                "Apply · variant 1"
            }

            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}"
            }
        }
    }
}
}

mod route_1 {
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        main {
            id: "progress_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-label": "Workspace sync controls",
            "aria-orientation": "vertical",
            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                role: "dialog",
                "aria-labelledby": "sync_dialog_title",
                open: (dialog_open)(),
                h2 {
                    id: "sync_dialog_title",
                    "Syncing workspace · variant 1"
                }
                div {
                    id: "sync_progress",
                    "data-component": "Progress",
                    role: "progressbar",
                    "aria-label": "Sync progress · variant 1",
                    "aria-valuenow": "20",
                    "aria-valuemin": "0",
                    "aria-valuemax": "100",
                    "aria-valuetext": "20%",
                    style: "width: 100%; height: 1rem; background: linear-gradient(to right, #2563eb 20%, #d1d5db 20%);"
                }
                button {
                    id: "sync_button",
                    "data-component": "Button",
                    "data-action": "ApplyFilter",
                    "data-target-id": "sync",
                    onclick: move |_| {
                        action_count += 1;
                        receipt.set("receipt:ApplyFilter:sync".to_string());
                    },
                    "Acknowledge sync · variant 1"
                }
            }
            div {
                role: "status",
                "aria-live": "polite",
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "Action count: {action_count} Receipt: {receipt}"
            }
        }
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
            "data-binding-sha256": "5178b9d94bac5edfe2b6d17bd71d76329909a115af7415a2d186c0a89f134388",
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
