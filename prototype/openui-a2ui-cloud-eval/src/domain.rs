use std::collections::{BTreeMap, BTreeSet};

use anyhow::{bail, Context};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const MAX_SOURCE_BYTES: usize = 256 * 1024;
pub const MAX_NODES: usize = 64;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    OpenUi,
    A2ui,
    #[serde(rename = "typed-json")]
    TypedJson,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ActionSpec {
    pub name: String,
    pub expense_id: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "kind")]
pub enum TypedNode {
    Text {
        id: String,
        text: String,
    },
    Stack {
        id: String,
        children: Vec<String>,
    },
    Card {
        id: String,
        title: String,
        child: String,
    },
    Table {
        id: String,
        columns: Vec<String>,
        rows: Vec<BTreeMap<String, String>>,
    },
    Input {
        id: String,
        label: String,
        state_key: String,
        value: String,
    },
    Select {
        id: String,
        label: String,
        state_key: String,
        options: Vec<String>,
        value: String,
    },
    Button {
        id: String,
        label: String,
        action: ActionSpec,
    },
    Alert {
        id: String,
        tone: String,
        message: String,
    },
}

impl TypedNode {
    pub fn id(&self) -> &str {
        match self {
            Self::Text { id, .. }
            | Self::Stack { id, .. }
            | Self::Card { id, .. }
            | Self::Table { id, .. }
            | Self::Input { id, .. }
            | Self::Select { id, .. }
            | Self::Button { id, .. }
            | Self::Alert { id, .. } => id,
        }
    }

    pub fn kind(&self) -> &'static str {
        match self {
            Self::Text { .. } => "Text",
            Self::Stack { .. } => "Stack",
            Self::Card { .. } => "Card",
            Self::Table { .. } => "Table",
            Self::Input { .. } => "Input",
            Self::Select { .. } => "Select",
            Self::Button { .. } => "Button",
            Self::Alert { .. } => "Alert",
        }
    }

    pub(crate) fn references(&self) -> Vec<&str> {
        match self {
            Self::Stack { children, .. } => children.iter().map(String::as_str).collect(),
            Self::Card { child, .. } => vec![child.as_str()],
            _ => Vec::new(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct Surface {
    pub protocol: Protocol,
    pub root: String,
    pub nodes: BTreeMap<String, TypedNode>,
    pub fields: BTreeMap<String, String>,
    pub source_hash: String,
}

impl Surface {
    pub fn new(
        protocol: Protocol,
        root: String,
        nodes: BTreeMap<String, TypedNode>,
        source: &[u8],
    ) -> anyhow::Result<Self> {
        if source.len() > MAX_SOURCE_BYTES {
            bail!("source exceeds {MAX_SOURCE_BYTES} bytes");
        }
        if nodes.is_empty() || nodes.len() > MAX_NODES {
            bail!("node count must be between 1 and {MAX_NODES}");
        }
        if !nodes.contains_key(&root) {
            bail!("broken root reference: {root}");
        }

        let mut referenced = BTreeSet::new();
        for (key, node) in &nodes {
            if key != node.id() {
                bail!("node key/id mismatch: {key} != {}", node.id());
            }
            if key.is_empty() {
                bail!("interactive and structural ids must not be empty");
            }
            for reference in node.references() {
                if !nodes.contains_key(reference) {
                    bail!("broken component reference: {reference}");
                }
                referenced.insert(reference.to_owned());
            }
        }
        let roots = nodes
            .keys()
            .filter(|id| !referenced.contains(*id))
            .collect::<Vec<_>>();
        if roots != vec![&root] {
            bail!("surface must have exactly one declared root");
        }

        let mut fields = BTreeMap::new();
        for node in nodes.values() {
            match node {
                TypedNode::Input {
                    state_key, value, ..
                }
                | TypedNode::Select {
                    state_key, value, ..
                } => {
                    if !matches!(state_key.as_str(), "review_note" | "status_filter") {
                        bail!("unknown state field: {state_key}");
                    }
                    if fields.insert(state_key.clone(), value.clone()).is_some() {
                        bail!("duplicate state field: {state_key}");
                    }
                }
                TypedNode::Button { action, .. } => {
                    if action.name != "ApproveExpense" || action.expense_id.is_empty() {
                        bail!("unknown action: {}", action.name);
                    }
                }
                _ => {}
            }
        }

        let source_hash = hash_bytes(source);
        Ok(Self {
            protocol,
            root,
            nodes,
            fields,
            source_hash,
        })
    }

    pub fn fingerprint(&self) -> String {
        #[derive(Serialize)]
        struct Semantic<'a> {
            root: &'a str,
            nodes: &'a BTreeMap<String, TypedNode>,
            fields: &'a BTreeMap<String, String>,
        }
        let bytes = serde_json::to_vec(&Semantic {
            root: &self.root,
            nodes: &self.nodes,
            fields: &self.fields,
        })
        .context("serialize semantic surface")
        .expect("surface serialization is infallible");
        hash_bytes(&bytes)
    }

    pub fn action(&self, name: &str, expense_id: &str) -> Option<&ActionSpec> {
        self.nodes.values().find_map(|node| match node {
            TypedNode::Button { action, .. }
                if action.name == name && action.expense_id == expense_id =>
            {
                Some(action)
            }
            _ => None,
        })
    }
}

pub fn hash_bytes(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
