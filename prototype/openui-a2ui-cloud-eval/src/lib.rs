mod a2ui;
mod domain;
mod openui;
mod runtime;

#[cfg(feature = "ui")]
pub mod catalog;

pub use a2ui::A2UiAdapter;
pub use domain::{ActionSpec, Protocol, Surface, TypedNode};
pub use openui::OpenUiAdapter;
pub use runtime::{ActionInvocation, ActionReceipt, ReplayProjection, ReplaySnapshot, Runtime};

use serde_json::Value;

pub trait ProtocolAdapter {
    fn normalize(&self, validated_program: &Value, source: &[u8]) -> anyhow::Result<Surface>;
}
