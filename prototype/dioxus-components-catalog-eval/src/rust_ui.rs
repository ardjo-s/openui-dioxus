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
            let id = node.id.clone();
            let children = strings(node, "children");
            rsx! { div { "data-component": "Card", upstream::card::Card { id,
                for child in children { {render_node(surface, &child)} }
            } } }
        }
        "Label" => {
            let id = node.id.clone();
            let text = string(node, "text");
            let for_id = string(node, "for_id");
            rsx! { div { "data-component": "Label", upstream::label::Label { id, html_for: for_id, {text} } } }
        }
        "Input" => {
            let id = node.id.clone();
            let label = string(node, "label");
            let value = string(node, "value");
            let placeholder = string(node, "placeholder");
            rsx! { div { "data-component": "Input", upstream::input::Input { id, aria_label: label, value, placeholder } } }
        }
        "Checkbox" => {
            let id = node.id.clone();
            let checked = boolean(node, "checked");
            let label = string(node, "label");
            rsx! { div { "data-component": "Checkbox", upstream::checkbox::Checkbox { id, class: "min-h-11 min-w-11", checked, aria_label: label } } }
        }
        "Button" => {
            let id = node.id.clone();
            let label = string(node, "label");
            let action = string(node, "action");
            let target = string(node, "target_id");
            let disabled = boolean(node, "disabled");
            rsx! { div { "data-component": "Button", "data-action": action, "data-target-id": target,
                upstream::button::Button { id, class: "min-h-11", disabled, {label} }
            } }
        }
        "Table" => {
            let id = node.id.clone();
            let caption = string(node, "caption");
            let columns = strings(node, "columns");
            let rows = node.props["rows"].as_array().unwrap().clone();
            rsx! { div { "data-component": "Table", upstream::table::Table { id,
                upstream::table::TableCaption { {caption} }
                upstream::table::TableHeader {
                    upstream::table::TableRow {
                        for column in columns { upstream::table::TableHead { {column} } }
                    }
                }
                upstream::table::TableBody {
                    for row in rows {
                        upstream::table::TableRow {
                            for cell in row["cells"].as_array().unwrap() {
                                upstream::table::TableCell { {cell.as_str().unwrap().to_owned()} }
                            }
                        }
                    }
                }
            } } }
        }
        "Progress" => {
            let id = node.id.clone();
            let value = number(node, "value");
            let max = number(node, "max");
            let label = string(node, "label");
            rsx! { div { "data-component": "Progress", upstream::progress::Progress { id, aria_label: label, value, max } } }
        }
        "Alert" => {
            let id = node.id.clone();
            let title = string(node, "title");
            let message = string(node, "message");
            let variant = if string(node, "tone") == "error" {
                upstream::alert::AlertVariant::Destructive
            } else {
                upstream::alert::AlertVariant::Default
            };
            rsx! { div { "data-component": "Alert", upstream::alert::Alert { id, variant,
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
