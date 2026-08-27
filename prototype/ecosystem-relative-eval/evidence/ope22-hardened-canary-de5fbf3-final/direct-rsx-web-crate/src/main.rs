mod route_0 {
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(String::new);

    rsx! {
        main {
            id: "app_root",
            "data-route": "direct-rsx",

            div {
                id: "filter_toolbar",
                "data-component": "Toolbar",
                role: "toolbar",
                "aria-label": "Filter actions",
                "aria-orientation": "horizontal",

                div {
                    id: "role_select",
                    "data-component": "Select",

                    label {
                        r#for: "role_select_control",
                        "Role · variant 1"
                    }

                    select {
                        id: "role_select_control",
                        value: "{role_filter}",
                        onchange: move |event| role_filter.set(event.value()),

                        option {
                            value: "All",
                            "All"
                        }
                        option {
                            value: "Admin",
                            "Admin"
                        }
                        option {
                            value: "Member",
                            "Member"
                        }
                    }
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

mod route_1 {
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut dialog_open = use_signal(|| true);
    let mut action_count = use_signal(|| 0u32);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        div {
            "data-route": "direct-rsx",
            id: "progress_toolbar",
            "data-component": "Toolbar",
            role: "toolbar",
            "aria-orientation": "vertical",

            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                open: dialog_open(),
                "aria-labelledby": "sync_dialog_title",

                h2 {
                    id: "sync_dialog_title",
                    "Syncing workspace · variant 1"
                }

                label {
                    r#for: "sync_progress",
                    "Sync progress · variant 1"
                }

                progress {
                    id: "sync_progress",
                    "data-component": "Progress",
                    max: "100",
                    value: "20",
                    "aria-label": "Sync progress · variant 1"
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
                "data-action-count": action_count(),
                "data-receipt": receipt(),
                "receipt:ApplyFilter:sync"
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
            "data-manifest-hash": "8aedc364174450ec8ed4a157ab16c9881d69522b32ec65488e19946892b5bb07",
            "data-binding-sha256": "53d1ab5046f989d3ef0bbeaa9dba622f34499ba3886c205142a385e00b6cc8b7",
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
