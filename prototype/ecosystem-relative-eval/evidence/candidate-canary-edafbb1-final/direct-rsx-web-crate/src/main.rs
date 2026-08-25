mod route_0 {
use dioxus::prelude::*;

pub fn App() -> Element {
    let mut role_filter = use_signal(|| "All".to_string());
    let mut action_count = use_signal(|| 0usize);
    let mut receipt = use_signal(|| String::new());

    rsx! {
        div {
            id: "filter_toolbar",
            "data-route": "direct-rsx",
            "data-component": "Root",

            div {
                id: "filter_toolbar",
                "data-component": "Toolbar",
                "aria-orientation": "horizontal",

                label {
                    for: "role_select",
                    "Role · variant 1"
                }

                select {
                    id: "role_select",
                    "data-component": "Select",
                    "data-state-key": "role_filter",
                    value: "{role_filter()}",
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
            }

            div {
                role: "status",
                "data-action-count": "{action_count()}",
                "data-receipt": "{receipt()}",
                "{receipt()}"
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
    let mut receipt = use_signal(String::new);

    rsx! {
        div {
            id: "progress_toolbar",
            "data-component": "Toolbar",
            "data-route": "direct-rsx",
            "data-orientation": "vertical",
            dialog {
                id: "sync_dialog",
                "data-component": "Dialog",
                title: "Syncing workspace · variant 1",
                open: dialog_open(),
                section {
                    id: "sync_progress",
                    "data-component": "Progress",
                    aria_label: "Sync progress · variant 1",
                    progress {
                        value: 20,
                        max: 100,
                    }
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
                "data-action-count": "{action_count}",
                "data-receipt": "{receipt}",
                "{receipt}"
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
    rsx! {
        document::Script { "document.documentElement.lang = 'en';" }
        div {
            id: "ope11-direct-rsx-root",
            style: "max-width: 860px; margin: 72px auto; padding: 24px; background: #d1d5db; border-radius: 12px; font-family: system-ui, sans-serif;",
            "data-manifest-hash": "eac280627d3042ef777d01142408661659aede6c16ca50cb8bd28120a9c3dd2c",
            "data-binding-sha256": "144d2145be10d71c9e0132f31d94aac49c8b03b865e3b5f38045e97743c38887",
            "data-surface-count": "2",
            "data-current-index": "{index}",
            section { style: "min-height: 260px; padding: 24px; background: white; border-radius: 8px;", "data-scenario-id": "{scenario_id}", {content} }
            nav { style: "margin-top: 16px;", aria_label: "Direct RSX navigation",
                button { r#type: "button", disabled: index == 0, onclick: move |_| current.set(index.saturating_sub(1)), "Previous Source" }
                button { r#type: "button", disabled: index + 1 >= 2, onclick: move |_| current.set((index + 1).min(1)), "Next Source" }
            }
        }
    }
}

fn main() { dioxus::launch(Root); }
