use anyhow::Context;
use dioxus::prelude::*;
use dioxus_components_catalog_eval::{
    platform::{PlatformProbe, ProbeReport},
    ui::render_surface,
    CatalogAdapter, DioxusComponentsCatalog, SurfaceRevision,
};
use serde::Deserialize;
use serde_json::Value;

const FIXTURES: &str = include_str!(concat!(env!("OUT_DIR"), "/ope11-dioxus-surfaces.json"));
const STYLE: &str = r#"
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #142033; background: #eef3f8; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(820px, calc(100% - 32px)); margin: 24px auto; padding: 24px; background: white; border: 1px solid #cbd5e1; border-radius: 16px; }
    .surface { display: grid; gap: 16px; }
    .controls, .navigation { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    input, select, button, [role="button"], [role="checkbox"], [role="switch"] { min-height: 44px; font: inherit; }
    button { padding: 10px 14px; color: white; background: #164e9a; border: 0; border-radius: 8px; }
    button.secondary { color: #142033; background: white; border: 1px solid #64748b; }
    button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 3px solid #f59e0b; outline-offset: 3px; }
    .status { padding: 12px; border-left: 4px solid #164e9a; background: #eaf3ff; }
    .status[data-probe-complete="true"] { border-color: #167044; background: #eaf8f0; }
"#;

#[derive(Clone, Debug, Deserialize)]
struct RawEntry {
    route: String,
    scenario_id: String,
    family: String,
    surface: Value,
}

#[derive(Clone, Debug, Deserialize)]
struct RawFixture {
    provenance: FixtureProvenance,
    entries: Vec<RawEntry>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct FixtureProvenance {
    pub manifest_hash: String,
    pub binding_sha256: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PlatformEntry {
    pub route: String,
    pub scenario_id: String,
    pub family: String,
    pub surface: SurfaceRevision,
}

#[derive(Clone, Debug)]
pub struct PlatformFixture {
    pub provenance: FixtureProvenance,
    pub entries: Vec<PlatformEntry>,
}

pub fn load_entries() -> anyhow::Result<Vec<PlatformEntry>> {
    Ok(load_fixture()?.entries)
}

pub fn load_fixture() -> anyhow::Result<PlatformFixture> {
    let raw: RawFixture = serde_json::from_str(FIXTURES).context("parse OPE-11 fixtures")?;
    let adapter = DioxusComponentsCatalog::new()?;
    let entries = raw.entries.into_iter()
        .map(|entry| {
            Ok(PlatformEntry {
                route: entry.route,
                scenario_id: entry.scenario_id,
                family: entry.family,
                surface: adapter.normalize(&serde_json::to_vec(&entry.surface)?)?,
            })
        })
        .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(PlatformFixture {
        provenance: raw.provenance,
        entries,
    })
}

pub fn run_contract(entry: &PlatformEntry) -> anyhow::Result<ProbeReport> {
    PlatformProbe::new(entry.surface.clone())?.run_all()
}

#[cfg(feature = "ssr")]
pub fn render_entry_html(entry: &PlatformEntry) -> String {
    format!(
        "<section data-scenario-id=\"{}\">{}</section>",
        entry.scenario_id,
        dioxus_ssr::render_element(render_surface(entry.surface.clone()))
    )
}

#[allow(non_snake_case)]
pub fn App() -> Element {
    let fixture = load_fixture().expect("embedded OPE-11 fixtures must validate");
    let entries = fixture.entries;
    let provenance = fixture.provenance;
    let count = entries.len();
    let mut current = use_signal(|| 0usize);
    let self_test_entries = entries.clone();
    let effect_provenance = provenance.clone();
    use_effect(move || {
        let passed = self_test_entries
            .iter()
            .filter(|entry| run_contract(entry).is_ok_and(|report| report.complete))
            .count();
        println!("OPE11_DIOXUS_RENDERED surfaces={count}");
        println!("OPE11_DIOXUS_SELF_TEST_PASS surfaces={passed}");
        println!("OPE11_DIOXUS_MANIFEST {}", effect_provenance.manifest_hash);
        println!("OPE11_DIOXUS_BINDING {}", effect_provenance.binding_sha256);
    });
    let index = current().min(count.saturating_sub(1));
    let entry = entries[index].clone();
    rsx! {
        document::Script { "document.documentElement.lang = 'en';" }
        style { "{STYLE}" }
        main {
            h1 { "OpenUI-Dioxus ecosystem canary" }
            p { "Two canonical runtime routes rendered by the same Dioxus catalog." }
            div {
                id: "ope11-dioxus-root",
                "data-surface-count": "{count}",
                "data-current-index": "{index}",
                ProbePanel { key: "{entry.route}-{entry.scenario_id}", entry }
            }
            div { hidden: true, aria_hidden: "true",
                span { id: "ope11-manifest-hash", "{provenance.manifest_hash}" }
                span { id: "ope11-binding-sha256", "{provenance.binding_sha256}" }
            }
            nav { class: "navigation", aria_label: "Canary surface navigation",
                button { class: "secondary", r#type: "button", disabled: index == 0, onclick: move |_| current.set(index.saturating_sub(1)), "Previous Surface" }
                button { class: "secondary", r#type: "button", disabled: index + 1 >= count, onclick: move |_| current.set((index + 1).min(count.saturating_sub(1))), "Next Surface" }
            }
        }
    }
}

#[component]
fn ProbePanel(entry: PlatformEntry) -> Element {
    let mut probe =
        use_signal(|| PlatformProbe::new(entry.surface.clone()).expect("probe Surface"));
    let mut status = use_signal(|| "ready".to_owned());
    let report = probe.read().report();
    rsx! {
        article {
            class: "surface",
            "data-route": "{entry.route}",
            "data-scenario-id": "{entry.scenario_id}",
            h2 { "{entry.family} via {entry.route}" }
            {render_surface(entry.surface.clone())}
            div { class: "controls", aria_label: "Runtime contract controls",
                button { r#type: "button", "data-probe-step": "state", onclick: move |_| match probe.write().step_state() { Ok(()) => status.set("state".into()), Err(error) => status.set(format!("error:{error}")) }, "Change state" }
                button { r#type: "button", "data-probe-step": "action", onclick: move |_| match probe.write().step_action() { Ok(()) => status.set("action".into()), Err(error) => status.set(format!("error:{error}")) }, "Invoke typed action" }
                button { r#type: "button", "data-probe-step": "update", onclick: move |_| match probe.write().step_update() { Ok(()) => status.set("update".into()), Err(error) => status.set(format!("error:{error}")) }, "Apply update" }
                button { r#type: "button", "data-probe-step": "replay", onclick: move |_| { probe.write().step_replay(); status.set("replay".into()); }, "Replay inertly" }
            }
            p {
                class: "status",
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
