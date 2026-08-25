use std::collections::{BTreeMap, BTreeSet};

use anyhow::{bail, Context};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

#[cfg(feature = "ui")]
pub mod platform;
#[cfg(feature = "ui")]
pub mod rust_ui;
#[cfg(feature = "ui")]
pub mod rust_ui_upstream;
#[cfg(feature = "ui")]
pub mod ui;

const MANIFEST: &str = include_str!("../catalog/manifest.json");
const RELEASE: &str = include_str!("../generated/release.json");
const RUST_UI_MANIFEST: &str = include_str!("../catalog/rust-ui-manifest.json");
const RUST_UI_RELEASE: &str = include_str!("../generated-rust-ui/release.json");
const MAX_SOURCE_BYTES: usize = 256 * 1024;
const MAX_NODES: usize = 64;

#[derive(Clone, Copy, Debug)]
pub struct GeneratedComponentSpec {
    pub name: &'static str,
    pub prop_order: &'static [&'static str],
    pub capability_families: &'static [&'static str],
    pub events: &'static [&'static str],
    pub source_module: &'static str,
    pub source_component: &'static str,
    pub source_kind: &'static str,
}

include!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/generated/registry.rs"
));

#[allow(dead_code)]
mod rust_ui_generated {
    use super::GeneratedComponentSpec;
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/generated-rust-ui/registry.rs"
    ));
}

#[derive(Clone, Debug, Deserialize)]
struct Manifest {
    catalog_id: String,
    root: String,
    state_keys: Vec<String>,
    state_schema: BTreeMap<String, String>,
    actions: Vec<ActionDefinition>,
    components: Vec<ComponentDefinition>,
}

#[derive(Clone, Debug, Deserialize)]
struct ActionDefinition {
    name: String,
}

#[derive(Clone, Debug, Deserialize)]
struct ComponentDefinition {
    name: String,
    prop_order: Vec<String>,
    props: BTreeMap<String, Value>,
    events: Vec<EventDefinition>,
    implementation: ImplementationDefinition,
}

#[derive(Clone, Debug, Deserialize)]
struct EventDefinition {
    name: String,
}

#[derive(Clone, Debug, Deserialize)]
struct ImplementationDefinition {
    module: String,
    component: String,
    source_kind: String,
}

#[derive(Clone, Debug, Deserialize)]
struct Release {
    catalog_release_hash: String,
    adapter_build_id: String,
}

#[derive(Clone, Debug, Deserialize)]
struct WireSurface {
    root: String,
    nodes: Vec<Value>,
    state: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct CanonicalNode {
    pub id: String,
    pub kind: String,
    pub props: BTreeMap<String, Value>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct SurfaceRevision {
    pub catalog_id: String,
    pub catalog_release_hash: String,
    pub root: String,
    pub nodes: BTreeMap<String, CanonicalNode>,
    pub state: BTreeMap<String, Value>,
}

impl SurfaceRevision {
    pub fn fingerprint(&self) -> String {
        #[derive(Serialize)]
        struct Semantic<'a> {
            root: &'a str,
            nodes: &'a BTreeMap<String, CanonicalNode>,
            state: &'a BTreeMap<String, Value>,
        }
        let semantic = Semantic {
            root: &self.root,
            nodes: &self.nodes,
            state: &self.state,
        };
        hex::encode(Sha256::digest(
            serde_json::to_vec(&semantic).expect("canonical Surface serializes"),
        ))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ReplayAudit {
    pub model_calls: usize,
    pub network_calls: usize,
    pub tool_calls: usize,
    pub navigation_calls: usize,
    pub host_effect_calls: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct MigrationReceipt {
    pub source_release_hash: String,
    pub target_release_hash: String,
    pub source_fingerprint: String,
    pub target_fingerprint: String,
    pub source_preserved: bool,
}

pub fn inert_replay(
    adapter: &impl CatalogAdapter,
    source: &[u8],
) -> anyhow::Result<(SurfaceRevision, ReplayAudit)> {
    let replay = adapter.normalize(source)?;
    Ok((
        replay,
        ReplayAudit {
            model_calls: 0,
            network_calls: 0,
            tool_calls: 0,
            navigation_calls: 0,
            host_effect_calls: 0,
        },
    ))
}

pub fn copy_on_write_migrate(
    source: &SurfaceRevision,
    expected_source_release: &str,
    target_release: &str,
) -> anyhow::Result<(SurfaceRevision, MigrationReceipt)> {
    if source.catalog_release_hash != expected_source_release {
        bail!("migration source compatibility identity mismatch");
    }
    if target_release.is_empty() || target_release == expected_source_release {
        bail!("migration target compatibility identity must be distinct");
    }
    let source_snapshot = source.clone();
    let mut target = source.clone();
    target.catalog_release_hash = target_release.to_owned();
    let receipt = MigrationReceipt {
        source_release_hash: source.catalog_release_hash.clone(),
        target_release_hash: target.catalog_release_hash.clone(),
        source_fingerprint: source.fingerprint(),
        target_fingerprint: target.fingerprint(),
        source_preserved: source == &source_snapshot,
    };
    Ok((target, receipt))
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventInput {
    String { value: String },
    Boolean { value: bool },
    Activate,
    Dismiss,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TypedEvent {
    FieldChanged { state_key: String, value: String },
    SelectionChanged { state_key: String, value: String },
    ToggleChanged { state_key: String, checked: bool },
    ActionInvoked { action: String, target_id: String },
    NavigationChanged { state_key: String, value: String },
    DialogChanged { state_key: String, open: bool },
    Dismissed { id: String },
}

pub trait CatalogAdapter {
    fn catalog_id(&self) -> &str;
    fn adapter_build_id(&self) -> &str;
    fn normalize(&self, source: &[u8]) -> anyhow::Result<SurfaceRevision>;
    fn event(
        &self,
        surface: &SurfaceRevision,
        node_id: &str,
        input: EventInput,
    ) -> anyhow::Result<TypedEvent>;
}

pub struct DioxusComponentsCatalog {
    contract: CatalogContract,
}

pub struct ThinCatalog {
    contract: CatalogContract,
}

pub struct RustUiCatalog {
    contract: CatalogContract,
}

struct CatalogContract {
    manifest: Manifest,
    public_id: String,
    adapter_build_id: String,
    catalog_release_hash: String,
}

impl DioxusComponentsCatalog {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            contract: CatalogContract::new(MANIFEST, RELEASE, GENERATED_COMPONENTS, None)?,
        })
    }
}

impl ThinCatalog {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            contract: CatalogContract::new(
                MANIFEST,
                RELEASE,
                GENERATED_COMPONENTS,
                Some("thin-reference-catalog"),
            )?,
        })
    }
}

impl RustUiCatalog {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            contract: CatalogContract::new(
                RUST_UI_MANIFEST,
                RUST_UI_RELEASE,
                rust_ui_generated::GENERATED_COMPONENTS,
                None,
            )?,
        })
    }
}

impl CatalogContract {
    fn new(
        manifest_source: &str,
        release_source: &str,
        generated_components: &[GeneratedComponentSpec],
        public_id: Option<&str>,
    ) -> anyhow::Result<Self> {
        let manifest: Manifest =
            serde_json::from_str(manifest_source).context("parse catalog manifest")?;
        let release: Release =
            serde_json::from_str(release_source).context("parse catalog release")?;
        if manifest.components.len() != generated_components.len() {
            bail!("generated registry and manifest disagree");
        }
        for (definition, generated) in manifest.components.iter().zip(generated_components) {
            let events = definition
                .events
                .iter()
                .map(|event| event.name.as_str())
                .collect::<Vec<_>>();
            if definition.name != generated.name
                || definition.prop_order != generated.prop_order
                || events != generated.events
                || definition.implementation.module != generated.source_module
                || definition.implementation.component != generated.source_component
                || definition.implementation.source_kind != generated.source_kind
            {
                bail!("generated registry drift for {}", definition.name);
            }
        }
        let public_id = public_id.unwrap_or(&manifest.catalog_id).to_owned();
        let adapter_build_id = if public_id == manifest.catalog_id {
            release.adapter_build_id.clone()
        } else {
            format!("thin-{}", &release.adapter_build_id)
        };
        let catalog_release_hash = if public_id == manifest.catalog_id {
            release.catalog_release_hash
        } else {
            hex::encode(Sha256::digest(
                format!(
                    "{}:{public_id}:{adapter_build_id}",
                    release.catalog_release_hash
                )
                .as_bytes(),
            ))
        };
        Ok(Self {
            manifest,
            public_id,
            adapter_build_id,
            catalog_release_hash,
        })
    }

    fn normalize(&self, source: &[u8]) -> anyhow::Result<SurfaceRevision> {
        if source.len() > MAX_SOURCE_BYTES {
            bail!("source exceeds {MAX_SOURCE_BYTES} bytes");
        }
        let value: Value = serde_json::from_slice(source).context("parse typed JSON Surface")?;
        let top = value.as_object().context("Surface must be an object")?;
        reject_unknown(top, &["root", "nodes", "state"], "Surface")?;
        let wire: WireSurface =
            serde_json::from_value(value).context("decode typed JSON Surface")?;
        if wire.nodes.is_empty() || wire.nodes.len() > MAX_NODES {
            bail!("node count must be between 1 and {MAX_NODES}");
        }
        self.validate_state(&wire.state)?;

        let definitions = self
            .manifest
            .components
            .iter()
            .map(|component| (component.name.as_str(), component))
            .collect::<BTreeMap<_, _>>();
        let mut nodes = BTreeMap::new();
        for raw in wire.nodes {
            let object = raw.as_object().context("node must be an object")?;
            let kind = string_prop(object, "kind")?.to_owned();
            let definition = definitions
                .get(kind.as_str())
                .with_context(|| format!("unknown component: {kind}"))?;
            let expected = std::iter::once("kind")
                .chain(definition.prop_order.iter().map(String::as_str))
                .collect::<Vec<_>>();
            reject_unknown(object, &expected, &kind)?;
            for prop in &definition.prop_order {
                let schema = definition
                    .props
                    .get(prop)
                    .with_context(|| format!("missing manifest schema: {kind}.{prop}"))?;
                let required = schema
                    .get("required")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                match object.get(prop) {
                    Some(value) => validate_value(schema, value, &format!("{kind}.{prop}"))?,
                    None if required => bail!("missing required property: {kind}.{prop}"),
                    None => {}
                }
            }
            let id = string_prop(object, "id")?.to_owned();
            if id.is_empty() || nodes.contains_key(&id) {
                bail!("duplicate or empty component id: {id}");
            }
            let props = definition
                .prop_order
                .iter()
                .filter_map(|name| object.get(name).map(|value| (name.clone(), value.clone())))
                .collect();
            nodes.insert(id.clone(), CanonicalNode { id, kind, props });
        }
        self.validate_graph(&wire.root, &nodes)?;
        self.validate_semantics(&nodes, &wire.state)?;
        Ok(SurfaceRevision {
            catalog_id: self.public_id.clone(),
            catalog_release_hash: self.catalog_release_hash.clone(),
            root: wire.root,
            nodes,
            state: wire.state,
        })
    }

    fn validate_state(&self, state: &BTreeMap<String, Value>) -> anyhow::Result<()> {
        let allowlist = self.manifest.state_keys.iter().collect::<BTreeSet<_>>();
        for (key, value) in state {
            if !allowlist.contains(key) {
                bail!("unknown state key: {key}");
            }
            let expected = self
                .manifest
                .state_schema
                .get(key)
                .context("state key missing schema")?;
            validate_scalar(expected, value, &format!("state.{key}"))?;
        }
        Ok(())
    }

    fn validate_graph(
        &self,
        root: &str,
        nodes: &BTreeMap<String, CanonicalNode>,
    ) -> anyhow::Result<()> {
        let root_node = nodes
            .get(root)
            .with_context(|| format!("broken root reference: {root}"))?;
        if root_node.kind != self.manifest.root {
            bail!("root must be {}", self.manifest.root);
        }
        let definitions = self
            .manifest
            .components
            .iter()
            .map(|component| (component.name.as_str(), component))
            .collect::<BTreeMap<_, _>>();
        let mut referenced = BTreeSet::new();
        let mut structural = BTreeSet::new();
        let mut adjacency = BTreeMap::<String, Vec<String>>::new();
        for node in nodes.values() {
            let definition = definitions[node.kind.as_str()];
            let mut node_structural = BTreeSet::new();
            for (name, schema) in &definition.props {
                if let Some(value) = node.props.get(name) {
                    collect_references(schema, value, &mut referenced, &mut node_structural)?;
                }
            }
            structural.extend(node_structural.iter().cloned());
            adjacency.insert(node.id.clone(), node_structural.into_iter().collect());
        }
        for reference in &referenced {
            if !nodes.contains_key(reference) {
                bail!("broken component reference: {reference}");
            }
        }
        let roots = nodes
            .keys()
            .filter(|id| !structural.contains(*id))
            .map(String::as_str)
            .collect::<Vec<_>>();
        if roots != [root] {
            bail!("Surface must have exactly one declared root");
        }
        let mut visiting = BTreeSet::new();
        let mut visited = BTreeSet::new();
        visit_graph(root, &adjacency, &mut visiting, &mut visited)?;
        if visited.len() != nodes.len() {
            bail!("Surface contains structurally unreachable components");
        }
        Ok(())
    }

    fn validate_semantics(
        &self,
        nodes: &BTreeMap<String, CanonicalNode>,
        state: &BTreeMap<String, Value>,
    ) -> anyhow::Result<()> {
        let mut bound_state = BTreeSet::new();
        let actions = self
            .manifest
            .actions
            .iter()
            .map(|action| action.name.as_str())
            .collect::<BTreeSet<_>>();
        for node in nodes.values() {
            for key_name in ["state_key", "open_state_key"] {
                if let Some(key) = node.props.get(key_name).and_then(Value::as_str) {
                    if !state.contains_key(key) {
                        bail!("component {} binds missing state key: {key}", node.id);
                    }
                    if !bound_state.insert(key.to_owned()) {
                        bail!("state key bound more than once: {key}");
                    }
                }
            }
            match node.kind.as_str() {
                "Input" | "Select" => {
                    let key = node.props["state_key"].as_str().unwrap();
                    if state[key] != node.props["value"] {
                        bail!("{} value disagrees with runtime state", node.id);
                    }
                }
                "Checkbox" | "Switch" => {
                    let key = node.props["state_key"].as_str().unwrap();
                    if state[key] != node.props["checked"] {
                        bail!("{} checked state disagrees with runtime state", node.id);
                    }
                }
                "Button" => {
                    let action = node.props["action"].as_str().unwrap();
                    if !actions.contains(action) {
                        bail!("unknown action: {action}");
                    }
                }
                "Progress" => {
                    let value = node.props["value"].as_f64().unwrap();
                    let max = node.props["max"].as_f64().unwrap();
                    if max <= 0.0 || value < 0.0 || value > max {
                        bail!("invalid progress range for {}", node.id);
                    }
                }
                "Tabs" => {
                    let selected = node.props["value"].as_str().unwrap();
                    let key = node.props["state_key"].as_str().unwrap();
                    if state[key] != node.props["value"] {
                        bail!("{} value disagrees with runtime state", node.id);
                    }
                    let mut values = BTreeSet::new();
                    for item in node.props["items"].as_array().unwrap() {
                        let value = item["value"].as_str().unwrap();
                        if !values.insert(value) {
                            bail!("duplicate tab value in {}: {value}", node.id);
                        }
                    }
                    if !values.contains(selected) {
                        bail!("active tab is not declared by {}", node.id);
                    }
                }
                "Label" => {
                    let target = node.props["for_id"].as_str().unwrap();
                    if nodes.get(target).map(|target| target.kind.as_str()) != Some("Input") {
                        bail!("Label {} must reference an Input", node.id);
                    }
                }
                _ => {}
            }
            if node.kind == "Select" {
                let value = node.props["value"].as_str().unwrap();
                let options = node.props["options"].as_array().unwrap();
                if options
                    .iter()
                    .filter(|option| option.as_str() == Some(value))
                    .count()
                    != 1
                {
                    bail!("Select value must occur exactly once in options");
                }
            }
        }
        if bound_state != state.keys().cloned().collect() {
            bail!("Surface state must be bound exactly once by declared components");
        }
        Ok(())
    }

    fn event(
        &self,
        surface: &SurfaceRevision,
        node_id: &str,
        input: EventInput,
    ) -> anyhow::Result<TypedEvent> {
        let node = surface
            .nodes
            .get(node_id)
            .with_context(|| format!("unknown event target: {node_id}"))?;
        let definition = self
            .manifest
            .components
            .iter()
            .find(|definition| definition.name == node.kind)
            .context("component missing from manifest")?;
        if definition.events.is_empty() {
            bail!("component {} emits no events", node.kind);
        }
        match (node.kind.as_str(), input) {
            ("Input", EventInput::String { value }) => Ok(TypedEvent::FieldChanged {
                state_key: string_value(&node.props, "state_key")?,
                value,
            }),
            ("Select", EventInput::String { value }) => {
                let allowed = node.props["options"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(Value::as_str)
                    .any(|option| option == value);
                if !allowed {
                    bail!("selection outside declared options");
                }
                Ok(TypedEvent::SelectionChanged {
                    state_key: string_value(&node.props, "state_key")?,
                    value,
                })
            }
            ("Checkbox" | "Switch", EventInput::Boolean { value }) => {
                Ok(TypedEvent::ToggleChanged {
                    state_key: string_value(&node.props, "state_key")?,
                    checked: value,
                })
            }
            ("Button", EventInput::Activate) => Ok(TypedEvent::ActionInvoked {
                action: string_value(&node.props, "action")?,
                target_id: string_value(&node.props, "target_id")?,
            }),
            ("Tabs", EventInput::String { value }) => {
                let allowed = node.props["items"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(|item| item.get("value").and_then(Value::as_str))
                    .any(|item| item == value);
                if !allowed {
                    bail!("navigation outside declared tab items");
                }
                Ok(TypedEvent::NavigationChanged {
                    state_key: string_value(&node.props, "state_key")?,
                    value,
                })
            }
            ("Dialog", EventInput::Boolean { value }) => Ok(TypedEvent::DialogChanged {
                state_key: string_value(&node.props, "open_state_key")?,
                open: value,
            }),
            ("Toast", EventInput::Dismiss) => Ok(TypedEvent::Dismissed {
                id: node.id.clone(),
            }),
            _ => bail!("invalid event input for {}", node.kind),
        }
    }
}

impl CatalogAdapter for RustUiCatalog {
    fn catalog_id(&self) -> &str {
        &self.contract.public_id
    }

    fn adapter_build_id(&self) -> &str {
        &self.contract.adapter_build_id
    }

    fn normalize(&self, source: &[u8]) -> anyhow::Result<SurfaceRevision> {
        self.contract.normalize(source)
    }

    fn event(
        &self,
        surface: &SurfaceRevision,
        node_id: &str,
        input: EventInput,
    ) -> anyhow::Result<TypedEvent> {
        self.contract.event(surface, node_id, input)
    }
}

impl CatalogAdapter for DioxusComponentsCatalog {
    fn catalog_id(&self) -> &str {
        &self.contract.public_id
    }

    fn adapter_build_id(&self) -> &str {
        &self.contract.adapter_build_id
    }

    fn normalize(&self, source: &[u8]) -> anyhow::Result<SurfaceRevision> {
        self.contract.normalize(source)
    }

    fn event(
        &self,
        surface: &SurfaceRevision,
        node_id: &str,
        input: EventInput,
    ) -> anyhow::Result<TypedEvent> {
        self.contract.event(surface, node_id, input)
    }
}

impl CatalogAdapter for ThinCatalog {
    fn catalog_id(&self) -> &str {
        &self.contract.public_id
    }

    fn adapter_build_id(&self) -> &str {
        &self.contract.adapter_build_id
    }

    fn normalize(&self, source: &[u8]) -> anyhow::Result<SurfaceRevision> {
        self.contract.normalize(source)
    }

    fn event(
        &self,
        surface: &SurfaceRevision,
        node_id: &str,
        input: EventInput,
    ) -> anyhow::Result<TypedEvent> {
        self.contract.event(surface, node_id, input)
    }
}

fn reject_unknown(object: &Map<String, Value>, allowed: &[&str], path: &str) -> anyhow::Result<()> {
    for key in object.keys() {
        if !allowed.contains(&key.as_str()) {
            bail!("unknown property: {path}.{key}");
        }
    }
    Ok(())
}

fn string_prop<'a>(object: &'a Map<String, Value>, name: &str) -> anyhow::Result<&'a str> {
    object
        .get(name)
        .and_then(Value::as_str)
        .with_context(|| format!("{name} must be a string"))
}

fn string_value(map: &BTreeMap<String, Value>, name: &str) -> anyhow::Result<String> {
    map.get(name)
        .and_then(Value::as_str)
        .map(str::to_owned)
        .with_context(|| format!("{name} must be a string"))
}

fn validate_scalar(expected: &str, value: &Value, path: &str) -> anyhow::Result<()> {
    let valid = match expected {
        "string" => value.is_string(),
        "boolean" => value.is_boolean(),
        "number" => value.is_number(),
        other => bail!("unsupported manifest scalar type: {other}"),
    };
    if !valid {
        bail!("invalid type at {path}: expected {expected}");
    }
    Ok(())
}

fn validate_value(schema: &Value, value: &Value, path: &str) -> anyhow::Result<()> {
    let expected = schema
        .get("type")
        .and_then(Value::as_str)
        .context("manifest property has no type")?;
    match expected {
        "string" | "boolean" | "number" => validate_scalar(expected, value, path)?,
        "array" => {
            let items = value
                .as_array()
                .with_context(|| format!("invalid type at {path}: expected array"))?;
            let item_schema = schema.get("items").context("array schema has no items")?;
            for (index, item) in items.iter().enumerate() {
                validate_value(item_schema, item, &format!("{path}[{index}]"))?;
            }
        }
        "object" => {
            let object = value
                .as_object()
                .with_context(|| format!("invalid type at {path}: expected object"))?;
            let properties = schema
                .get("properties")
                .and_then(Value::as_object)
                .context("object schema has no properties")?;
            let allowed = properties.keys().map(String::as_str).collect::<Vec<_>>();
            reject_unknown(object, &allowed, path)?;
            for required in schema
                .get("required")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
            {
                if !object.contains_key(required) {
                    bail!("missing required property: {path}.{required}");
                }
            }
            for (name, child_schema) in properties {
                if let Some(child) = object.get(name) {
                    validate_value(child_schema, child, &format!("{path}.{name}"))?;
                }
            }
        }
        other => bail!("unsupported manifest property type: {other}"),
    }
    if let Some(values) = schema.get("enum").and_then(Value::as_array) {
        if !values.contains(value) {
            bail!("value outside enum at {path}");
        }
    }
    Ok(())
}

fn collect_references(
    schema: &Value,
    value: &Value,
    references: &mut BTreeSet<String>,
    structural: &mut BTreeSet<String>,
) -> anyhow::Result<()> {
    if let Some(format @ ("component-ref" | "component-id-ref")) =
        schema.get("format").and_then(Value::as_str)
    {
        let reference = value
            .as_str()
            .context("component reference must be a string")?
            .to_owned();
        references.insert(reference.clone());
        if format == "component-ref" {
            structural.insert(reference);
        }
    }
    match schema.get("type").and_then(Value::as_str) {
        Some("array") => {
            let item_schema = schema.get("items").context("array schema has no items")?;
            for item in value.as_array().context("reference array expected")? {
                collect_references(item_schema, item, references, structural)?;
            }
        }
        Some("object") => {
            let properties = schema
                .get("properties")
                .and_then(Value::as_object)
                .context("object schema has no properties")?;
            let object = value.as_object().context("reference object expected")?;
            for (name, child_schema) in properties {
                if let Some(child) = object.get(name) {
                    collect_references(child_schema, child, references, structural)?;
                }
            }
        }
        _ => {}
    }
    Ok(())
}

fn visit_graph(
    id: &str,
    adjacency: &BTreeMap<String, Vec<String>>,
    visiting: &mut BTreeSet<String>,
    visited: &mut BTreeSet<String>,
) -> anyhow::Result<()> {
    if visited.contains(id) {
        return Ok(());
    }
    if !visiting.insert(id.to_owned()) {
        bail!("structural component cycle detected at {id}");
    }
    for child in adjacency.get(id).into_iter().flatten() {
        visit_graph(child, adjacency, visiting, visited)?;
    }
    visiting.remove(id);
    visited.insert(id.to_owned());
    Ok(())
}
