use dioxus::prelude::*;

use crate::{rust_ui_upstream as upstream, CanonicalNode, SurfaceRevision};

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
        "Card" => {
            let children = strings(node, "children");
            rsx! { div { "data-component": "Card", upstream::card::Card {
                for child in children { {render_node(surface, &child)} }
            } } }
        }
        "Label" => {
            let text = string(node, "text");
            let for_id = string(node, "for_id");
            rsx! { div { "data-component": "Label", upstream::label::Label { html_for: for_id, {text} } } }
        }
        "Input" => {
            let id = node.id.clone();
            let value = string(node, "value");
            let placeholder = string(node, "placeholder");
            rsx! { div { "data-component": "Input", upstream::input::Input { id, value, placeholder } } }
        }
        "Checkbox" => {
            let checked = boolean(node, "checked");
            let label = string(node, "label");
            rsx! { div { "data-component": "Checkbox", upstream::checkbox::Checkbox { checked, aria_label: label } } }
        }
        "Button" => {
            let id = node.id.clone();
            let label = string(node, "label");
            let action = string(node, "action");
            let target = string(node, "target_id");
            rsx! { div { "data-component": "Button", "data-action": action, "data-target-id": target,
                upstream::button::Button { id, {label} }
            } }
        }
        "Tabs" => {
            let value = string(node, "value");
            let items = node.props["items"].as_array().unwrap().clone();
            rsx! { div { "data-component": "Tabs", upstream::tabs::Tabs { default_value: value,
                upstream::tabs::TabsList {
                    for item in &items { upstream::tabs::TabsTrigger { value: item["value"].as_str().unwrap().to_owned(), {item["label"].as_str().unwrap().to_owned()} } }
                }
                for item in &items { upstream::tabs::TabsContent { value: item["value"].as_str().unwrap().to_owned(), {render_node(surface, item["child"].as_str().unwrap())} } }
            } } }
        }
        "Progress" => {
            let value = number(node, "value");
            let max = number(node, "max");
            let label = string(node, "label");
            rsx! { div { "data-component": "Progress", aria_label: label, upstream::progress::Progress { value, max } } }
        }
        "Alert" => {
            let title = string(node, "title");
            let message = string(node, "message");
            let variant = if string(node, "tone") == "error" {
                upstream::alert::AlertVariant::Destructive
            } else {
                upstream::alert::AlertVariant::Default
            };
            rsx! { div { "data-component": "Alert", upstream::alert::Alert { variant,
                upstream::alert::AlertTitle { {title} }
                upstream::alert::AlertDescription { {message} }
            } } }
        }
        other => panic!("validated Rust/UI registry contains unknown component: {other}"),
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
