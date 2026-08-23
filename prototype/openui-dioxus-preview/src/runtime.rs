use std::collections::{BTreeMap, BTreeSet};

const CATALOG: [&str; 8] = [
    "Text", "Stack", "Card", "Table", "Input", "Select", "Button", "Alert",
];

#[derive(Clone, Debug, PartialEq, Eq)]
enum WireValue {
    String(String),
    Ref(String),
    List(Vec<WireValue>),
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct WireNode {
    name: String,
    component: String,
    args: Vec<WireValue>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct Surface {
    root: String,
    nodes: Vec<WireNode>,
}

/// The one typed action this prototype permits.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TypedAction {
    ApproveExpense,
}

/// A committed semantic node. Its fields are wire-level values; a renderer
/// maps them to its own future Dioxus view props.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Node {
    Text {
        name: String,
        text: String,
    },
    Stack {
        name: String,
        children: Vec<String>,
    },
    Card {
        name: String,
        title: String,
        child: String,
    },
    Table {
        name: String,
        columns: Vec<String>,
        rows: Vec<String>,
    },
    Input {
        name: String,
        label: String,
        field: String,
        value: String,
    },
    Select {
        name: String,
        label: String,
        options: Vec<String>,
        field: String,
        value: String,
    },
    Button {
        name: String,
        label: String,
        action: TypedAction,
    },
    Alert {
        name: String,
        tone: String,
        message: String,
    },
}

/// A renderer-ready semantic projection of the accepted surface.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Projection {
    pub root: String,
    pub nodes: Vec<Node>,
    fingerprint: u64,
    inert: bool,
}

impl Projection {
    pub fn semantic_fingerprint(&self) -> u64 {
        self.fingerprint
    }

    pub fn is_inert(&self) -> bool {
        self.inert
    }
}

/// A durable, self-contained snapshot used to create an inert replay.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Checkpoint {
    surface: Surface,
    fields: BTreeMap<String, String>,
    fingerprint: u64,
}

/// The in-memory receipt produced by the approved typed action.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Receipt {
    pub action: TypedAction,
    pub sequence: u64,
    pub message: String,
}

pub struct Runtime {
    accepted: Option<Surface>,
    fields: BTreeMap<String, String>,
    receipts: Vec<Receipt>,
    diagnostics: Vec<String>,
}

impl Runtime {
    pub fn new() -> Self {
        Self {
            accepted: None,
            fields: BTreeMap::new(),
            receipts: Vec::new(),
            diagnostics: Vec::new(),
        }
    }

    /// Parse and validate off to the side, then replace the accepted surface
    /// only after every check succeeds.
    pub fn propose(&mut self, proposal: &str) -> Result<Projection, String> {
        let surface = match parse_and_validate(proposal) {
            Ok(surface) => surface,
            Err(error) => {
                self.diagnostics.push(error.clone());
                return Err(error);
            }
        };

        let field_names = fields_in(&surface);
        self.fields.retain(|field, _| field_names.contains(field));
        for field in field_names {
            self.fields.entry(field).or_default();
        }
        self.accepted = Some(surface);
        self.receipts.clear();
        self.diagnostics.clear();
        Ok(self
            .projection()
            .expect("accepted surface was just committed"))
    }

    pub fn projection(&self) -> Option<Projection> {
        self.accepted
            .as_ref()
            .map(|surface| self.make_projection(surface, false, None))
    }

    pub fn set_field(&mut self, field: &str, value: &str) -> Result<Projection, String> {
        if !self.fields.contains_key(field) {
            let error = format!("unknown field: {field}");
            self.diagnostics.push(error.clone());
            return Err(error);
        }
        self.fields.insert(field.to_owned(), value.to_owned());
        Ok(self
            .projection()
            .expect("field state requires a committed surface"))
    }

    pub fn invoke(&mut self, action: TypedAction) -> Result<Receipt, String> {
        if self.accepted.is_none() {
            let error = "action denied: no committed surface".to_owned();
            self.diagnostics.push(error.clone());
            return Err(error);
        }
        if self.receipts.len() >= 1 {
            let error = "action denied: effect already recorded".to_owned();
            self.diagnostics.push(error.clone());
            return Err(error);
        }

        let receipt = Receipt {
            action,
            sequence: 1,
            message: "ApproveExpense recorded in memory".to_owned(),
        };
        self.receipts.push(receipt.clone());
        Ok(receipt)
    }

    pub fn checkpoint(&self) -> Option<Checkpoint> {
        let surface = self.accepted.clone()?;
        let fingerprint = self
            .projection()
            .expect("checkpoint requires a committed surface")
            .semantic_fingerprint();
        Some(Checkpoint {
            surface,
            fields: self.fields.clone(),
            fingerprint,
        })
    }

    pub fn replay(&self, checkpoint: &Checkpoint) -> Result<Projection, String> {
        let projection = self.make_projection(&checkpoint.surface, true, Some(&checkpoint.fields));
        if projection.semantic_fingerprint() != checkpoint.fingerprint {
            return Err("checkpoint fingerprint mismatch".to_owned());
        }
        Ok(projection)
    }

    pub fn diagnostics(&self) -> &[String] {
        &self.diagnostics
    }

    pub fn effect_count(&self) -> usize {
        self.receipts.len()
    }

    fn make_projection(
        &self,
        surface: &Surface,
        inert: bool,
        fields: Option<&BTreeMap<String, String>>,
    ) -> Projection {
        let fields = fields.unwrap_or(&self.fields);
        let nodes = surface
            .nodes
            .iter()
            .map(|node| materialize(node, fields))
            .collect::<Vec<_>>();
        let fingerprint = fingerprint(&surface.root, &nodes);
        Projection {
            root: surface.root.clone(),
            nodes,
            fingerprint,
            inert,
        }
    }
}

impl Default for Runtime {
    fn default() -> Self {
        Self::new()
    }
}

fn parse_and_validate(proposal: &str) -> Result<Surface, String> {
    let mut wire_nodes = Vec::new();
    for (line_number, line) in proposal.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        wire_nodes.push(parse_line(line, line_number + 1)?);
    }
    validate(wire_nodes)
}

fn parse_line(line: &str, line_number: usize) -> Result<WireNode, String> {
    let mut parser = Parser::new(line);
    let name = parser.identifier("node name")?;
    parser.whitespace();
    parser.expect('=', "'='")?;
    parser.whitespace();
    let component = parser.identifier("component")?;
    parser.whitespace();
    parser.expect('(', "'('")?;
    let args = parser.arguments()?;
    parser.whitespace();
    if !parser.done() {
        return Err(format!("line {line_number}: unexpected trailing input"));
    }
    Ok(WireNode {
        name,
        component,
        args,
    })
}

fn validate(wire_nodes: Vec<WireNode>) -> Result<Surface, String> {
    if wire_nodes.is_empty() {
        return Err("proposal is empty".to_owned());
    }

    let mut names = BTreeSet::new();
    for node in &wire_nodes {
        if !names.insert(node.name.clone()) {
            return Err(format!("duplicate node: {}", node.name));
        }
        if !CATALOG.contains(&node.component.as_str()) {
            return Err(format!(
                "component not in closed catalog: {}",
                node.component
            ));
        }
    }

    let mut refs = BTreeSet::new();
    for node in &wire_nodes {
        for reference in references(node)? {
            if !names.contains(&reference) {
                return Err(format!("unknown node reference: {reference}"));
            }
            refs.insert(reference);
        }
    }
    let roots = wire_nodes
        .iter()
        .filter(|node| !refs.contains(&node.name))
        .map(|node| node.name.clone())
        .collect::<Vec<_>>();
    if roots.len() != 1 {
        return Err(format!("expected one root, found {}", roots.len()));
    }

    let root = roots[0].clone();
    let mut reachable = BTreeSet::new();
    visit(&root, &wire_nodes, &mut reachable, &mut BTreeSet::new())?;
    if reachable.len() != wire_nodes.len() {
        return Err("surface contains an unreachable node".to_owned());
    }

    Ok(Surface {
        root,
        nodes: wire_nodes,
    })
}

fn references(node: &WireNode) -> Result<Vec<String>, String> {
    match node.component.as_str() {
        "Text" => expect_args(node, 1)
            .and_then(|args| expect_string(&args[0], "Text").map(|_| Vec::new())),
        "Stack" => expect_args(node, 1).and_then(|args| expect_refs(&args[0], "Stack")),
        "Card" => expect_args(node, 2).and_then(|args| {
            expect_string(&args[0], "Card")?;
            expect_ref(&args[1], "Card")
        }),
        "Table" => expect_args(node, 2).and_then(|args| {
            expect_string_list(&args[0], "Table")?;
            expect_refs(&args[1], "Table")
        }),
        "Input" => expect_args(node, 2).and_then(|args| {
            expect_string(&args[0], "Input")?;
            expect_ref(&args[1], "Input")?;
            Ok(Vec::new())
        }),
        "Select" => expect_args(node, 3).and_then(|args| {
            expect_string(&args[0], "Select")?;
            expect_string_list(&args[1], "Select")?;
            expect_ref(&args[2], "Select")?;
            Ok(Vec::new())
        }),
        "Button" => expect_args(node, 2).and_then(|args| {
            expect_string(&args[0], "Button")?;
            match &args[1] {
                WireValue::Ref(action) if action == "ApproveExpense" => Ok(Vec::new()),
                _ => Err("Button expects the ApproveExpense action".to_owned()),
            }
        }),
        "Alert" => expect_args(node, 2).and_then(|args| {
            expect_string(&args[0], "Alert")?;
            expect_string(&args[1], "Alert")?;
            Ok(Vec::new())
        }),
        _ => unreachable!("catalog was checked before references"),
    }
}

fn expect_args<'a>(node: &'a WireNode, count: usize) -> Result<&'a [WireValue], String> {
    if node.args.len() == count {
        Ok(&node.args)
    } else {
        Err(format!(
            "{} expects {count} positional props",
            node.component
        ))
    }
}

fn expect_string(value: &WireValue, component: &str) -> Result<String, String> {
    match value {
        WireValue::String(value) => Ok(value.clone()),
        _ => Err(format!("{component} expects a quoted string")),
    }
}

fn expect_ref(value: &WireValue, component: &str) -> Result<Vec<String>, String> {
    match value {
        WireValue::Ref(value) => Ok(vec![value.clone()]),
        _ => Err(format!("{component} expects a direct node reference")),
    }
}

fn expect_refs(value: &WireValue, component: &str) -> Result<Vec<String>, String> {
    match value {
        WireValue::List(values) => values
            .iter()
            .map(|value| match value {
                WireValue::Ref(reference) => Ok(reference.clone()),
                _ => Err(format!("{component} expects a list of node references")),
            })
            .collect(),
        _ => Err(format!("{component} expects a reference list")),
    }
}

fn visit(
    name: &str,
    nodes: &[WireNode],
    reachable: &mut BTreeSet<String>,
    visiting: &mut BTreeSet<String>,
) -> Result<(), String> {
    if !visiting.insert(name.to_owned()) {
        return Err(format!("cyclic node reference: {name}"));
    }
    if reachable.insert(name.to_owned()) {
        let node = nodes
            .iter()
            .find(|node| node.name == name)
            .expect("validated node reference");
        for child in references(node)? {
            visit(&child, nodes, reachable, visiting)?;
        }
    }
    visiting.remove(name);
    Ok(())
}

fn fields_in(surface: &Surface) -> BTreeSet<String> {
    surface
        .nodes
        .iter()
        .filter_map(|node| match node.component.as_str() {
            "Input" => match node.args.get(1) {
                Some(WireValue::Ref(field)) => Some(field.clone()),
                _ => None,
            },
            "Select" => match node.args.get(2) {
                Some(WireValue::Ref(field)) => Some(field.clone()),
                _ => None,
            },
            _ => None,
        })
        .collect()
}

fn materialize(node: &WireNode, fields: &BTreeMap<String, String>) -> Node {
    let args = &node.args;
    match node.component.as_str() {
        "Text" => Node::Text {
            name: node.name.clone(),
            text: expect_string(&args[0], "Text").expect("validated Text"),
        },
        "Stack" => Node::Stack {
            name: node.name.clone(),
            children: expect_refs(&args[0], "Stack").expect("validated Stack"),
        },
        "Card" => Node::Card {
            name: node.name.clone(),
            title: expect_string(&args[0], "Card").expect("validated Card"),
            child: expect_ref(&args[1], "Card").expect("validated Card")[0].clone(),
        },
        "Table" => Node::Table {
            name: node.name.clone(),
            columns: expect_string_list(&args[0], "Table").expect("validated Table"),
            rows: expect_refs(&args[1], "Table").expect("validated Table"),
        },
        "Input" => {
            let field = expect_ref(&args[1], "Input").expect("validated Input")[0].clone();
            Node::Input {
                name: node.name.clone(),
                label: expect_string(&args[0], "Input").expect("validated Input"),
                value: fields.get(&field).cloned().unwrap_or_default(),
                field,
            }
        }
        "Select" => {
            let field = expect_ref(&args[2], "Select").expect("validated Select")[0].clone();
            Node::Select {
                name: node.name.clone(),
                label: expect_string(&args[0], "Select").expect("validated Select"),
                options: expect_string_list(&args[1], "Select").expect("validated Select"),
                value: fields.get(&field).cloned().unwrap_or_default(),
                field,
            }
        }
        "Button" => Node::Button {
            name: node.name.clone(),
            label: expect_string(&args[0], "Button").expect("validated Button"),
            action: TypedAction::ApproveExpense,
        },
        "Alert" => Node::Alert {
            name: node.name.clone(),
            tone: expect_string(&args[0], "Alert").expect("validated Alert"),
            message: expect_string(&args[1], "Alert").expect("validated Alert"),
        },
        _ => unreachable!("catalog was checked before materialization"),
    }
}

fn expect_string_list(value: &WireValue, component: &str) -> Result<Vec<String>, String> {
    match value {
        WireValue::List(values) => values
            .iter()
            .map(|value| expect_string(value, component))
            .collect(),
        _ => Err(format!("{component} expects a quoted string list")),
    }
}

fn fingerprint(root: &str, nodes: &[Node]) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    let mut add = |text: &str| {
        for byte in text.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash ^= 0xff;
        hash = hash.wrapping_mul(0x100000001b3);
    };
    add(root);
    for node in nodes {
        match node {
            Node::Text { name, text } => {
                add("Text");
                add(name);
                add(text);
            }
            Node::Stack { name, children } => {
                add("Stack");
                add(name);
                for child in children {
                    add(child);
                }
            }
            Node::Card { name, title, child } => {
                add("Card");
                add(name);
                add(title);
                add(child);
            }
            Node::Table {
                name,
                columns,
                rows,
            } => {
                add("Table");
                add(name);
                for column in columns {
                    add(column);
                }
                for row in rows {
                    add(row);
                }
            }
            Node::Input {
                name,
                label,
                field,
                value,
            } => {
                add("Input");
                add(name);
                add(label);
                add(field);
                add(value);
            }
            Node::Select {
                name,
                label,
                options,
                field,
                value,
            } => {
                add("Select");
                add(name);
                add(label);
                for option in options {
                    add(option);
                }
                add(field);
                add(value);
            }
            Node::Button {
                name,
                label,
                action,
            } => {
                add("Button");
                add(name);
                add(label);
                add(match action {
                    TypedAction::ApproveExpense => "ApproveExpense",
                });
            }
            Node::Alert {
                name,
                tone,
                message,
            } => {
                add("Alert");
                add(name);
                add(tone);
                add(message);
            }
        }
    }
    hash
}

struct Parser<'a> {
    input: &'a str,
    index: usize,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Self { input, index: 0 }
    }

    fn done(&self) -> bool {
        self.index == self.input.len()
    }

    fn whitespace(&mut self) {
        while self.index < self.input.len() {
            let ch = self.input[self.index..].chars().next().unwrap();
            if !ch.is_whitespace() {
                break;
            }
            self.index += ch.len_utf8();
        }
    }

    fn expect(&mut self, expected: char, label: &str) -> Result<(), String> {
        if self.input[self.index..].starts_with(expected) {
            self.index += expected.len_utf8();
            Ok(())
        } else {
            Err(format!("expected {label}"))
        }
    }

    fn identifier(&mut self, label: &str) -> Result<String, String> {
        let start = self.index;
        let mut chars = self.input[self.index..].char_indices();
        match chars.next() {
            Some((_, ch)) if ch.is_ascii_alphabetic() || ch == '_' => {
                self.index += ch.len_utf8();
            }
            _ => return Err(format!("expected {label}")),
        }
        for (_, ch) in chars {
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
                self.index += ch.len_utf8();
            } else {
                break;
            }
        }
        Ok(self.input[start..self.index].to_owned())
    }

    fn arguments(&mut self) -> Result<Vec<WireValue>, String> {
        self.whitespace();
        if self.input[self.index..].starts_with(')') {
            self.index += 1;
            return Ok(Vec::new());
        }
        let mut values = Vec::new();
        loop {
            self.whitespace();
            values.push(self.value()?);
            self.whitespace();
            if self.input[self.index..].starts_with(',') {
                self.index += 1;
                continue;
            }
            self.expect(')', "')'")?;
            return Ok(values);
        }
    }

    fn value(&mut self) -> Result<WireValue, String> {
        if self.input[self.index..].starts_with('"') {
            return self.string().map(WireValue::String);
        }
        if self.input[self.index..].starts_with('[') {
            self.index += 1;
            let mut values = Vec::new();
            self.whitespace();
            if self.input[self.index..].starts_with(']') {
                self.index += 1;
                return Ok(WireValue::List(values));
            }
            loop {
                self.whitespace();
                values.push(self.value()?);
                self.whitespace();
                if self.input[self.index..].starts_with(',') {
                    self.index += 1;
                    continue;
                }
                self.expect(']', "']'")?;
                return Ok(WireValue::List(values));
            }
        }
        self.identifier("value").map(WireValue::Ref)
    }

    fn string(&mut self) -> Result<String, String> {
        self.expect('"', "opening quote")?;
        let mut value = String::new();
        while !self.done() {
            let ch = self.input[self.index..].chars().next().unwrap();
            self.index += ch.len_utf8();
            match ch {
                '"' => return Ok(value),
                '\\' => {
                    let escaped = self.input[self.index..]
                        .chars()
                        .next()
                        .ok_or_else(|| "unterminated escape".to_owned())?;
                    self.index += escaped.len_utf8();
                    value.push(match escaped {
                        '"' => '"',
                        '\\' => '\\',
                        'n' => '\n',
                        't' => '\t',
                        other => return Err(format!("unsupported escape: \\{other}")),
                    });
                }
                other => value.push(other),
            }
        }
        Err("unterminated string".to_owned())
    }
}
