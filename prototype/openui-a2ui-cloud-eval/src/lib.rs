mod a2ui;
mod domain;
mod eval;
mod openui;
mod runtime;
mod typed_json;

#[cfg(feature = "ui")]
pub mod catalog;

pub use a2ui::A2UiAdapter;
pub use domain::{ActionSpec, Protocol, Surface, TypedNode};
pub use eval::{EvalLatency, EvalProvider, EvalRecord, EvalTokenUsage};
pub use openui::OpenUiAdapter;
pub use runtime::{ActionInvocation, ActionReceipt, ReplayProjection, ReplaySnapshot, Runtime};
pub use typed_json::TypedJsonAdapter;

use serde_json::Value;

pub trait ProtocolAdapter {
    fn normalize(&self, validated_program: &Value, source: &[u8]) -> anyhow::Result<Surface>;
}
