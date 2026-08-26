use dioxus::prelude::*;
use dioxus_primitives::{avatar, checkbox, dialog, progress, select, switch, tabs, toast, toolbar};
use serde_json::Value;

use crate::{CanonicalNode, SurfaceRevision};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UpstreamBinding {
    pub catalog_component: &'static str,
    pub rust_path: &'static str,
}

const UPSTREAM_BINDINGS: &[UpstreamBinding] = &[
    UpstreamBinding {
        catalog_component: "Label",
        rust_path: "dioxus_primitives::label::Label",
    },
    UpstreamBinding {
        catalog_component: "Toolbar",
        rust_path: "dioxus_primitives::toolbar::Toolbar",
    },
    UpstreamBinding {
        catalog_component: "Avatar",
        rust_path: "dioxus_primitives::avatar::Avatar",
    },
    UpstreamBinding {
        catalog_component: "Input",
        rust_path: "preview::components::input::Input",
    },
    UpstreamBinding {
        catalog_component: "Select",
        rust_path: "dioxus_primitives::select::Select",
    },
    UpstreamBinding {
        catalog_component: "Checkbox",
        rust_path: "dioxus_primitives::checkbox::Checkbox",
    },
    UpstreamBinding {
        catalog_component: "Switch",
        rust_path: "dioxus_primitives::switch::Switch",
    },
    UpstreamBinding {
        catalog_component: "Button",
        rust_path: "preview::components::button::Button",
    },
    UpstreamBinding {
        catalog_component: "Tabs",
        rust_path: "dioxus_primitives::tabs::Tabs",
    },
    UpstreamBinding {
        catalog_component: "Dialog",
        rust_path: "dioxus_primitives::dialog::DialogRoot",
    },
    UpstreamBinding {
        catalog_component: "Progress",
        rust_path: "dioxus_primitives::progress::Progress",
    },
    UpstreamBinding {
        catalog_component: "Toast",
        rust_path: "dioxus_primitives::toast::Toast",
    },
];

pub fn upstream_bindings() -> &'static [UpstreamBinding] {
    UPSTREAM_BINDINGS
}

pub fn render_surface(surface: SurfaceRevision) -> Element {
    rsx! { SurfaceView { surface } }
}

#[component]
fn SurfaceView(surface: SurfaceRevision) -> Element {
    render_node(&surface, &surface.root)
}

fn render_node(surface: &SurfaceRevision, id: &str) -> Element {
    let node = surface
        .nodes
        .get(id)
        .expect("validated component reference");
    match node.kind.as_str() {
        "Label" => render_label(node),
        "Toolbar" => render_toolbar(surface, node),
        "Avatar" => render_avatar(node),
        "Input" => render_input(node),
        "Select" => render_select(node),
        "Checkbox" => render_checkbox(node),
        "Switch" => render_switch(node),
        "Button" => render_button(node),
        "Tabs" => render_tabs(surface, node),
        "Dialog" => render_dialog(surface, node),
        "Progress" => render_progress(node),
        "Toast" => render_toast(node),
        other => panic!("validated registry contains unknown component: {other}"),
    }
}

fn render_label(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let for_id = string(node, "for_id");
    let text = string(node, "text");
    rsx! {
        dioxus_primitives::label::Label {
            id,
            html_for: for_id,
            "data-component": "Label",
            {text}
        }
    }
}

fn render_toolbar(surface: &SurfaceRevision, node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let horizontal = string(node, "orientation") == "horizontal";
    let children = strings(node, "children");
    rsx! {
        toolbar::Toolbar {
            id,
            horizontal,
            aria_label: "Generated interface",
            aria_orientation: if horizontal { "horizontal" } else { "vertical" },
            "data-component": "Toolbar",
            for child in children {
                {render_node(surface, &child)}
            }
        }
    }
}

fn render_avatar(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let alt = string(node, "alt");
    let fallback = string(node, "fallback");
    rsx! {
        avatar::Avatar {
            id,
            aria_label: alt,
            "data-component": "Avatar",
            avatar::AvatarFallback { {fallback} }
        }
    }
}

fn render_input(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let label = string(node, "label");
    let state_key = string(node, "state_key");
    let value = string(node, "value");
    let placeholder = string(node, "placeholder");
    let input_id = id.clone();
    rsx! {
        label { r#for: id.clone(), {label}
            DioxusInput { id: input_id, value, placeholder, state_key }
        }
    }
}

#[component]
fn DioxusInput(id: String, value: String, placeholder: String, state_key: String) -> Element {
    rsx! {
        input {
            class: "dx_input",
            id,
            value,
            placeholder,
            "data-state-key": state_key,
            "data-component": "Input",
            "data-upstream-source": "preview::components::input::Input"
        }
    }
}

fn render_select(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let label = string(node, "label");
    let value = string(node, "value");
    let options = strings(node, "options");
    rsx! {
        select::Select::<String> {
            id,
            default_value: Some(value.clone()),
            "data-component": "Select",
            select::SelectTrigger { aria_label: label.clone(),
                select::SelectValue { placeholder: value.clone() }
            }
            select::SelectList { aria_label: label,
                for (index, option) in options.into_iter().enumerate() {
                    select::SelectOption::<String> {
                        index,
                        value: option.clone(),
                        text_value: Some(option.clone()),
                        {option}
                    }
                }
            }
        }
    }
}

fn render_checkbox(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let label = string(node, "label");
    let checked = if boolean(node, "checked") {
        checkbox::CheckboxState::Checked
    } else {
        checkbox::CheckboxState::Unchecked
    };
    rsx! {
        checkbox::Checkbox {
            id,
            checked: Some(checked),
            aria_label: label.clone(),
            "data-component": "Checkbox",
            checkbox::CheckboxIndicator { "✓" }
        }
        span { {label} }
    }
}

fn render_switch(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let label = string(node, "label");
    let checked = boolean(node, "checked");
    rsx! {
        switch::Switch {
            id,
            checked: Some(checked),
            aria_label: label.clone(),
            "data-component": "Switch",
            switch::SwitchThumb {}
        }
        span { {label} }
    }
}

fn render_button(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let label = string(node, "label");
    let action = string(node, "action");
    let target = string(node, "target_id");
    rsx! { DioxusButton { id, label, action, target } }
}

#[component]
fn DioxusButton(id: String, label: String, action: String, target: String) -> Element {
    rsx! {
        button {
            class: "dx_button",
            id,
            r#type: "button",
            "data-component": "Button",
            "data-action": action,
            "data-target-id": target,
            "data-upstream-source": "preview::components::button::Button",
            {label}
        }
    }
}

fn render_tabs(surface: &SurfaceRevision, node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let value = string(node, "value");
    let items = node.props["items"].as_array().unwrap().clone();
    rsx! {
        tabs::Tabs {
            id,
            default_value: value,
            horizontal: true,
            "data-component": "Tabs",
            tabs::TabList {
                for (index, item) in items.iter().enumerate() {
                    tabs::TabTrigger {
                        index,
                        value: item["value"].as_str().unwrap().to_owned(),
                        {item["label"].as_str().unwrap().to_owned()}
                    }
                }
            }
            for (index, item) in items.iter().enumerate() {
                tabs::TabContent {
                    index,
                    value: item["value"].as_str().unwrap().to_owned(),
                    {render_node(surface, item["child"].as_str().unwrap())}
                }
            }
        }
    }
}

fn render_dialog(surface: &SurfaceRevision, node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let title = string(node, "title");
    let state_key = string(node, "open_state_key");
    let open = surface.state[&state_key].as_bool().unwrap();
    let children = strings(node, "children");
    #[cfg(feature = "ssr")]
    return rsx! {
        section {
            id,
            role: "dialog",
            aria_label: title.clone(),
            hidden: !open,
            "data-component": "Dialog",
            "data-platform-adaptation": "ssr-inert",
            h2 { {title.clone()} }
            for child in children {
                {render_node(surface, &child)}
            }
        }
    };

    #[cfg(not(feature = "ssr"))]
    rsx! {
        dialog::DialogRoot {
            id: Some(id),
            open: Some(open),
            "data-component": "Dialog",
            dialog::DialogContent {
                dialog::DialogTitle { {title} }
                for child in children {
                    {render_node(surface, &child)}
                }
            }
        }
    }
}

fn render_progress(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let label = string(node, "label");
    let value = number(node, "value");
    let max = number(node, "max");
    rsx! {
        progress::Progress {
            id,
            value: Some(value),
            max,
            aria_label: label,
            "data-component": "Progress",
            progress::ProgressIndicator {}
        }
    }
}

fn render_toast(node: &CanonicalNode) -> Element {
    let id = node.id.clone();
    let title = string(node, "title");
    let message = string(node, "message");
    let tone = match string(node, "tone").as_str() {
        "success" => toast::ToastType::Success,
        "warning" => toast::ToastType::Warning,
        "error" => toast::ToastType::Error,
        _ => toast::ToastType::Info,
    };
    rsx! {
        toast::ToastProvider {
            toast::Toast {
                id: 0usize,
                index: 0usize,
                title,
                description: Some(message),
                toast_type: tone,
                on_close: move |_| {},
                permanent: true,
                duration: None,
                "data-node-id": id,
                "data-component": "Toast"
            }
        }
    }
}

fn string(node: &CanonicalNode, name: &str) -> String {
    node.props[name].as_str().unwrap().to_owned()
}

fn strings(node: &CanonicalNode, name: &str) -> Vec<String> {
    node.props[name]
        .as_array()
        .unwrap()
        .iter()
        .map(|value| value.as_str().unwrap().to_owned())
        .collect()
}

fn boolean(node: &CanonicalNode, name: &str) -> bool {
    node.props[name].as_bool().unwrap()
}

fn number(node: &CanonicalNode, name: &str) -> f64 {
    node.props[name].as_f64().unwrap()
}

#[allow(dead_code)]
fn _compile_upstream_prop_types() {
    use std::any::TypeId;
    let _ = [
        TypeId::of::<dioxus_primitives::label::LabelProps>(),
        TypeId::of::<toolbar::ToolbarProps>(),
        TypeId::of::<avatar::AvatarProps>(),
        TypeId::of::<select::SelectProps<String>>(),
        TypeId::of::<checkbox::CheckboxProps>(),
        TypeId::of::<switch::SwitchProps>(),
        TypeId::of::<tabs::TabsProps>(),
        TypeId::of::<dialog::DialogRootProps>(),
        TypeId::of::<progress::ProgressProps>(),
        TypeId::of::<toast::ToastProps>(),
    ];
    let _ = Value::Null;
}
