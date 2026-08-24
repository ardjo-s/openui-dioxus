use std::collections::BTreeMap;

use anyhow::{bail, Context};
use serde_json::Value;

use crate::{Protocol, ProtocolAdapter, Surface, TypedNode};

pub struct TypedJsonAdapter;

impl ProtocolAdapter for TypedJsonAdapter {
    fn normalize(&self, validated_program: &Value, source: &[u8]) -> anyhow::Result<Surface> {
        if validated_program.get("ok") != Some(&Value::Bool(true)) {
            bail!("typed-JSON validator did not accept program");
        }
        let program = validated_program
            .get("program")
            .context("typed-JSON validator missing program")?;
        let root = program
            .get("root")
            .and_then(Value::as_str)
            .context("typed-JSON program missing root")?
            .to_owned();
        let values = program
            .get("nodes")
            .and_then(Value::as_array)
            .context("typed-JSON program missing nodes")?;
        let mut nodes = BTreeMap::new();
        for value in values {
            let node: TypedNode = serde_json::from_value(value.clone())
                .context("typed-JSON node does not match the canonical catalog")?;
            let id = node.id().to_owned();
            if nodes.insert(id.clone(), node).is_some() {
                bail!("duplicate component id: {id}");
            }
        }
        Surface::new(Protocol::TypedJson, root, nodes, source)
    }
}
