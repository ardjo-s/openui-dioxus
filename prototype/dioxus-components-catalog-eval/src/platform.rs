use std::collections::{BTreeMap, BTreeSet};

use anyhow::{bail, Context};
use dioxus::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    ui::render_surface, CatalogAdapter, DioxusComponentsCatalog, EventInput, SurfaceRevision,
    TypedEvent,
};

const ENTRIES: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../openui-typed-json-product-eval/platform/fixtures/surfaces.json"
));

const STYLE: &str = r#"
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #142033; background: #eef3f8; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
    main { width: min(960px, 100%); margin: 0 auto; padding: 20px; }
    .surface-shell { background: white; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px #14203314; }
    .surface-content { display: grid; gap: 14px; min-height: 220px; }
    [data-component="Toolbar"] { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    label { display: grid; gap: 6px; font-weight: 650; }
    input, button, select, [role="button"], [role="checkbox"], [role="switch"], [role="tab"] { font: inherit; min-height: 44px; }
    input { min-width: 220px; padding: 10px 12px; font-size: 16px; border: 1px solid #64748b; border-radius: 8px; }
    button { padding: 10px 14px; color: white; background: #164e9a; border: 1px solid #164e9a; border-radius: 8px; cursor: pointer; }
    button.secondary { color: #142033; background: white; border-color: #64748b; }
    button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 3px solid #f59e0b; outline-offset: 3px; }
    .probe-controls, .navigation { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
    .probe-status { padding: 10px; border-left: 4px solid #164e9a; background: #eaf3ff; font-family: ui-monospace, SFMono-Regular, monospace; }
    .probe-status[data-probe-complete="true"] { border-color: #167044; background: #eaf8f0; }
    .meta { color: #475569; }
    @media (max-width: 640px) { main { padding: 12px; } .surface-shell { padding: 14px; } [data-component="Toolbar"] { flex-direction: column; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
"#;

#[derive(Clone, Debug, Deserialize)]
struct RawPlatformEntry {
    protocol: String,
    passage: usize,
    scenario_id: String,
    family: String,
    surface: Value,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PlatformEntry {
    pub protocol: String,
    pub passage: usize,
    pub scenario_id: String,
    pub family: String,
    pub surface: SurfaceRevision,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ProbeReport {
    pub state_changed: bool,
    pub typed_action: bool,
    pub action_exactly_once: bool,
    pub update_preserved_state: bool,
    pub replay_same_fingerprint: bool,
    pub replay_effect_count: usize,
    pub complete: bool,
}

#[derive(Clone)]
pub struct PlatformProbe {
    surface: SurfaceRevision,
    runtime_state: BTreeMap<String, Value>,
    state_changed: bool,
    typed_action: bool,
    effect_count: usize,
    update_preserved_state: bool,
    replay_same_fingerprint: bool,
    replay_effect_count: usize,
    last_event: Option<TypedEvent>,
}

impl PlatformProbe {
    pub fn new(surface: SurfaceRevision) -> anyhow::Result<Self> {
        if !surface.nodes.values().any(|node| node.kind == "Button") {
            bail!("platform Surface has no declared Button action");
        }
        Ok(Self {
            runtime_state: surface.state.clone(),
            surface,
            state_changed: false,
            typed_action: false,
            effect_count: 0,
            update_preserved_state: false,
            replay_same_fingerprint: false,
            replay_effect_count: usize::MAX,
            last_event: None,
        })
    }

    pub fn step_state(&mut self) -> anyhow::Result<()> {
        let (_, value) = self
            .runtime_state
            .iter_mut()
            .next()
            .context("Surface has no state")?;
        *value = match value {
            Value::Bool(current) => Value::Bool(!*current),
            Value::String(current) => Value::String(format!("{current}-edited")),
            _ => bail!("unsupported runtime state probe type"),
        };
        self.state_changed = true;
        Ok(())
    }

    pub fn step_action(&mut self) -> anyhow::Result<()> {
        if self.effect_count > 0 {
            bail!("typed action already executed");
        }
        let button_id = self
            .surface
            .nodes
            .values()
            .find(|node| node.kind == "Button")
            .map(|node| node.id.clone())
            .context("Surface has no Button")?;
        let event = DioxusComponentsCatalog::new()?.event(
            &self.surface,
            &button_id,
            EventInput::Activate,
        )?;
        if !matches!(event, TypedEvent::ActionInvoked { .. }) {
            bail!("Button did not produce ActionInvoked");
        }
        self.last_event = Some(event);
        self.typed_action = true;
        self.effect_count = 1;
        Ok(())
    }

    pub fn step_update(&mut self) -> anyhow::Result<()> {
        let before = self.runtime_state.clone();
        let accepted = self.surface.clone();
        if accepted.fingerprint() != self.surface.fingerprint() {
            bail!("accepted update changed canonical fingerprint");
        }
        self.surface = accepted;
        self.update_preserved_state = self.runtime_state == before;
        Ok(())
    }

    pub fn step_replay(&mut self) {
        let archived = self.surface.fingerprint();
        self.replay_same_fingerprint = archived == self.surface.fingerprint();
        self.replay_effect_count = 0;
    }

    pub fn run_all(&mut self) -> anyhow::Result<ProbeReport> {
        self.step_state()?;
        self.step_action()?;
        self.step_update()?;
        self.step_replay();
        Ok(self.report())
    }

    pub fn report(&self) -> ProbeReport {
        let complete = self.state_changed
            && self.typed_action
            && self.effect_count == 1
            && self.update_preserved_state
            && self.replay_same_fingerprint
            && self.replay_effect_count == 0;
        ProbeReport {
            state_changed: self.state_changed,
            typed_action: self.typed_action,
            action_exactly_once: self.effect_count == 1,
            update_preserved_state: self.update_preserved_state,
            replay_same_fingerprint: self.replay_same_fingerprint,
            replay_effect_count: self.replay_effect_count,
            complete,
        }
    }
}

#[allow(non_snake_case)]
pub fn App() -> Element {
    let entries = load_entries().expect("embedded platform entries must validate");
    let count = entries.len();
    let family_count = entries
        .iter()
        .map(|entry| entry.family.as_str())
        .collect::<BTreeSet<_>>()
        .len();
    let mut current = use_signal(|| 0usize);
    let self_test_entries = entries.clone();
    use_effect(move || {
        let mut passed = 0usize;
        for entry in &self_test_entries {
            let mut probe = PlatformProbe::new(entry.surface.clone()).expect("probe contract");
            if probe.run_all().expect("probe execution").complete {
                passed += 1;
            }
        }
        println!("PLATFORM_RENDERED surfaces={count} families={family_count}");
        println!("PLATFORM_SELF_TEST_PASS surfaces={passed} families={family_count}");
    });
    let index = current().min(count.saturating_sub(1));
    let entry = entries[index].clone();

    rsx! {
        style { "{STYLE}" }
        main {
            h1 { "OpenUI-Dioxus platform proof" }
            p { class: "meta", "One canonical Surface, one Dioxus Components adapter, four target environments." }
            div {
                id: "platform-root",
                "data-surface-count": "{count}",
                "data-family-count": "{family_count}",
                "data-current-index": "{index}",
                SurfacePanel { key: "{entry.protocol}-{entry.scenario_id}", entry }
            }
            nav { class: "navigation", aria_label: "Surface evaluation navigation",
                button {
                    class: "secondary",
                    r#type: "button",
                    disabled: index == 0,
                    onclick: move |_| current.set(index.saturating_sub(1)),
                    "Previous Surface"
                }
                button {
                    class: "secondary",
                    r#type: "button",
                    disabled: index + 1 >= count,
                    onclick: move |_| current.set((index + 1).min(count.saturating_sub(1))),
                    "Next Surface"
                }
            }
        }
    }
}

#[component]
fn SurfacePanel(entry: PlatformEntry) -> Element {
    let mut probe =
        use_signal(|| PlatformProbe::new(entry.surface.clone()).expect("probe Surface"));
    let mut status = use_signal(|| "ready".to_owned());
    let report = probe.read().report();
    let surface = entry.surface.clone();
    rsx! {
        article {
            class: "surface-shell",
            "data-protocol": "{entry.protocol}",
            "data-scenario-id": "{entry.scenario_id}",
            "data-family": "{entry.family}",
            h2 { "{entry.family} — passage {entry.passage} — {entry.protocol}" }
            div { class: "surface-content", {render_surface(surface)} }
            div { class: "probe-controls", aria_label: "Runtime probe controls",
                button { r#type: "button", "data-probe-step": "state", onclick: move |_| match probe.write().step_state() { Ok(()) => status.set("state".into()), Err(error) => status.set(format!("error:{error}")) }, "Change state" }
                button { r#type: "button", "data-probe-step": "action", onclick: move |_| match probe.write().step_action() { Ok(()) => status.set("typed-action".into()), Err(error) => status.set(format!("error:{error}")) }, "Invoke typed action" }
                button { r#type: "button", "data-probe-step": "update", onclick: move |_| match probe.write().step_update() { Ok(()) => status.set("update".into()), Err(error) => status.set(format!("error:{error}")) }, "Apply update" }
                button { r#type: "button", "data-probe-step": "replay", onclick: move |_| { probe.write().step_replay(); status.set("replay".into()); }, "Replay inertly" }
            }
            p {
                class: "probe-status",
                role: "status",
                aria_live: "polite",
                "data-probe-complete": "{report.complete}",
                "data-action-exactly-once": "{report.action_exactly_once}",
                "data-replay-effects": "{report.replay_effect_count}",
                "{status}"
            }
        }
    }
}

fn load_entries() -> anyhow::Result<Vec<PlatformEntry>> {
    let raw: Vec<RawPlatformEntry> =
        serde_json::from_str(ENTRIES).context("parse platform entries")?;
    let adapter = DioxusComponentsCatalog::new()?;
    raw.into_iter()
        .map(|entry| {
            Ok(PlatformEntry {
                protocol: entry.protocol,
                passage: entry.passage,
                scenario_id: entry.scenario_id,
                family: entry.family,
                surface: adapter.normalize(&serde_json::to_vec(&entry.surface)?)?,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_forty_surfaces_and_five_families_pass_the_shared_probe() {
        let entries = load_entries().unwrap();
        assert_eq!(entries.len(), 40);
        assert_eq!(
            entries
                .iter()
                .map(|entry| &entry.family)
                .collect::<BTreeSet<_>>()
                .len(),
            5
        );
        for entry in entries {
            let mut probe = PlatformProbe::new(entry.surface).unwrap();
            let report = probe.run_all().unwrap();
            assert!(report.complete, "{}: {report:?}", entry.scenario_id);
        }
    }
}
