use std::collections::BTreeMap;

use anyhow::{anyhow, bail, Context};
use serde_json::{Map, Value};

use crate::{ActionSpec, Protocol, ProtocolAdapter, Surface, TypedNode};

pub struct A2UiAdapter;

impl ProtocolAdapter for A2UiAdapter {
    fn normalize(&self, validated_program: &Value, source: &[u8]) -> anyhow::Result<Surface> {
        if validated_program.get("ok") != Some(&Value::Bool(true)) {
            bail!("A2UI oracle did not accept messages");
        }
        let diagnostics = validated_program
            .get("diagnostics")
            .and_then(Value::as_array)
            .context("A2UI oracle missing diagnostics")?;
        if !diagnostics.is_empty() {
            bail!("A2UI diagnostics: {}", serde_json::to_string(diagnostics)?);
        }
        let components = validated_program
            .pointer("/resolved/components")
            .and_then(Value::as_array)
            .context("A2UI oracle missing resolved components")?;

        let mut nodes = BTreeMap::new();
        for component in components {
            let component = component
                .as_object()
                .context("resolved A2UI component must be an object")?;
            let id = string(component, "id")?;
            let kind = string(component, "component")?;
            let props = object(component, "properties")?;
            let node = normalize_component(&id, &kind, props)?;
            if nodes.insert(id.clone(), node).is_some() {
                bail!("duplicate component id: {id}");
            }
        }

        let mut referenced = std::collections::BTreeSet::new();
        for reference in nodes.values().flat_map(TypedNode::references) {
            if !nodes.contains_key(reference) {
                bail!("broken component reference: {reference}");
            }
            referenced.insert(reference);
        }
        let roots = nodes
            .keys()
            .filter(|id| !referenced.contains(id.as_str()))
            .cloned()
            .collect::<Vec<_>>();
        if roots.len() != 1 {
            bail!("A2UI surface must have one root, found {}", roots.len());
        }
        Surface::new(Protocol::A2ui, roots[0].clone(), nodes, source)
    }
}

fn normalize_component(
    id: &str,
    kind: &str,
    props: &Map<String, Value>,
) -> anyhow::Result<TypedNode> {
    let id = id.to_owned();
    Ok(match kind {
        "Text" => TypedNode::Text {
            id,
            text: string(props, "text")?,
        },
        "Stack" => TypedNode::Stack {
            id,
            children: string_array(props, "children")?,
        },
        "Card" => TypedNode::Card {
            id,
            title: string(props, "title")?,
            child: string(props, "child")?,
        },
        "Table" => TypedNode::Table {
            id,
            columns: string_array(props, "columns")?,
            rows: table_rows(props)?,
        },
        "Input" => TypedNode::Input {
            id,
            label: string(props, "label")?,
            state_key: string(props, "state_key")?,
            value: string(props, "value")?,
        },
        "Select" => TypedNode::Select {
            id,
            label: string(props, "label")?,
            state_key: string(props, "state_key")?,
            options: string_array(props, "options")?,
            value: string(props, "value")?,
        },
        "Button" => {
            let action = object(props, "action")?;
            TypedNode::Button {
                id,
                label: string(props, "label")?,
                action: ActionSpec {
                    name: string(action, "name")?,
                    expense_id: string(action, "expense_id")?,
                },
            }
        }
        "Alert" => TypedNode::Alert {
            id,
            tone: string(props, "tone")?,
            message: string(props, "message")?,
        },
        _ => bail!("unknown component: {kind}"),
    })
}

fn object<'a>(value: &'a Map<String, Value>, key: &str) -> anyhow::Result<&'a Map<String, Value>> {
    value
        .get(key)
        .and_then(Value::as_object)
        .with_context(|| format!("missing object: {key}"))
}

fn string(value: &Map<String, Value>, key: &str) -> anyhow::Result<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| anyhow!("missing string: {key}"))
}

fn string_array(value: &Map<String, Value>, key: &str) -> anyhow::Result<Vec<String>> {
    value
        .get(key)
        .and_then(Value::as_array)
        .with_context(|| format!("missing array: {key}"))?
        .iter()
        .map(|item| {
            item.as_str()
                .map(str::to_owned)
                .ok_or_else(|| anyhow!("{key} must contain strings"))
        })
        .collect()
}

fn table_rows(value: &Map<String, Value>) -> anyhow::Result<Vec<BTreeMap<String, String>>> {
    value
        .get("rows")
        .and_then(Value::as_array)
        .context("Table missing rows")?
        .iter()
        .map(|row| {
            row.as_object()
                .context("table row must be an object")?
                .iter()
                .map(|(key, value)| {
                    value
                        .as_str()
                        .map(|value| (key.clone(), value.to_owned()))
                        .ok_or_else(|| anyhow!("table values must be strings"))
                })
                .collect()
        })
        .collect()
}
