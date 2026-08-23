use std::collections::BTreeMap;

use anyhow::{anyhow, bail, Context};
use serde_json::{Map, Value};

use crate::{ActionSpec, Protocol, ProtocolAdapter, Surface, TypedNode};

pub struct OpenUiAdapter;

impl ProtocolAdapter for OpenUiAdapter {
    fn normalize(&self, validated_program: &Value, source: &[u8]) -> anyhow::Result<Surface> {
        if validated_program.get("ok") != Some(&Value::Bool(true)) {
            bail!("OpenUI oracle did not accept program");
        }
        let parse = validated_program
            .get("parse")
            .context("OpenUI oracle missing parse result")?;
        let meta = object(parse, "meta")?;
        ensure_empty_array(meta, "errors")?;
        ensure_empty_array(meta, "unresolved")?;
        ensure_empty_array(meta, "orphaned")?;
        if meta.get("incomplete").and_then(Value::as_bool) != Some(false) {
            bail!("OpenUI program is incomplete");
        }

        let root = parse
            .get("root")
            .context("OpenUI parse result missing root")?;
        let mut nodes = BTreeMap::new();
        let root_id = normalize_element(root, &mut nodes)?;
        Surface::new(Protocol::OpenUi, root_id, nodes, source)
    }
}

fn normalize_element(
    value: &Value,
    nodes: &mut BTreeMap<String, TypedNode>,
) -> anyhow::Result<String> {
    let element = value
        .as_object()
        .context("component must be an OpenUI element object")?;
    if element.get("type").and_then(Value::as_str) != Some("element") {
        bail!("component must be an OpenUI element");
    }
    let kind = string(element, "typeName")?;
    let props = object_map(element, "props")?;
    let id = string(props, "id")?;

    let node = match kind.as_str() {
        "Text" => TypedNode::Text {
            id: id.clone(),
            text: string(props, "text")?,
        },
        "Stack" => {
            let children = array(props, "children")?
                .iter()
                .map(|child| normalize_element(child, nodes))
                .collect::<anyhow::Result<Vec<_>>>()?;
            TypedNode::Stack {
                id: id.clone(),
                children,
            }
        }
        "Card" => TypedNode::Card {
            id: id.clone(),
            title: string(props, "title")?,
            child: normalize_element(props.get("child").context("Card missing child")?, nodes)?,
        },
        "Table" => TypedNode::Table {
            id: id.clone(),
            columns: string_array(props, "columns")?,
            rows: table_rows(props)?,
        },
        "Input" => TypedNode::Input {
            id: id.clone(),
            label: string(props, "label")?,
            state_key: string(props, "state_key")?,
            value: string(props, "value")?,
        },
        "Select" => TypedNode::Select {
            id: id.clone(),
            label: string(props, "label")?,
            state_key: string(props, "state_key")?,
            options: string_array(props, "options")?,
            value: string(props, "value")?,
        },
        "Button" => {
            let action = object_map(props, "action")?;
            TypedNode::Button {
                id: id.clone(),
                label: string(props, "label")?,
                action: ActionSpec {
                    name: string(action, "name")?,
                    expense_id: string(action, "expense_id")?,
                },
            }
        }
        "Alert" => TypedNode::Alert {
            id: id.clone(),
            tone: string(props, "tone")?,
            message: string(props, "message")?,
        },
        _ => bail!("unknown component: {kind}"),
    };

    if nodes.insert(id.clone(), node).is_some() {
        bail!("duplicate component id: {id}");
    }
    Ok(id)
}

fn object<'a>(value: &'a Value, key: &str) -> anyhow::Result<&'a Map<String, Value>> {
    value
        .get(key)
        .and_then(Value::as_object)
        .with_context(|| format!("missing object: {key}"))
}

fn object_map<'a>(
    value: &'a Map<String, Value>,
    key: &str,
) -> anyhow::Result<&'a Map<String, Value>> {
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

fn array<'a>(value: &'a Map<String, Value>, key: &str) -> anyhow::Result<&'a Vec<Value>> {
    value
        .get(key)
        .and_then(Value::as_array)
        .with_context(|| format!("missing array: {key}"))
}

fn string_array(value: &Map<String, Value>, key: &str) -> anyhow::Result<Vec<String>> {
    array(value, key)?
        .iter()
        .map(|item| {
            item.as_str()
                .map(str::to_owned)
                .ok_or_else(|| anyhow!("{key} must contain only strings"))
        })
        .collect()
}

fn table_rows(value: &Map<String, Value>) -> anyhow::Result<Vec<BTreeMap<String, String>>> {
    array(value, "rows")?
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

fn ensure_empty_array(meta: &Map<String, Value>, key: &str) -> anyhow::Result<()> {
    let items = meta
        .get(key)
        .and_then(Value::as_array)
        .with_context(|| format!("OpenUI meta missing {key}"))?;
    if items.is_empty() {
        Ok(())
    } else {
        bail!("OpenUI {key}: {}", serde_json::to_string(items)?)
    }
}
