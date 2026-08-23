use std::collections::BTreeMap;

use anyhow::{bail, Context};
use serde::{Deserialize, Serialize};

use crate::Surface;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ActionInvocation {
    pub invocation_id: String,
    pub action: String,
    pub expense_id: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ActionReceipt {
    pub invocation_id: String,
    pub action: String,
    pub expense_id: String,
    pub sequence: u64,
    pub outcome: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ReplaySnapshot {
    pub surface: Surface,
    pub state: BTreeMap<String, String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct ReplayProjection {
    pub fingerprint: String,
    pub state: BTreeMap<String, String>,
    pub effect_count: usize,
}

impl ReplaySnapshot {
    pub fn replay(&self) -> anyhow::Result<ReplayProjection> {
        let fingerprint = self.surface.fingerprint();
        if self
            .state
            .keys()
            .any(|field| !self.surface.fields.contains_key(field))
        {
            bail!("snapshot contains state outside accepted surface");
        }
        Ok(ReplayProjection {
            fingerprint,
            state: self.state.clone(),
            effect_count: 0,
        })
    }
}

#[derive(Clone)]
pub struct Runtime {
    surface: Surface,
    state: BTreeMap<String, String>,
    receipts: BTreeMap<String, ActionReceipt>,
}

impl Runtime {
    pub fn new(surface: Surface) -> Self {
        Self {
            state: surface.fields.clone(),
            surface,
            receipts: BTreeMap::new(),
        }
    }

    pub fn surface(&self) -> &Surface {
        &self.surface
    }

    pub fn state(&self) -> &BTreeMap<String, String> {
        &self.state
    }

    pub fn set_field(&mut self, field: &str, value: &str) -> anyhow::Result<()> {
        let current = self
            .state
            .get_mut(field)
            .with_context(|| format!("unknown field: {field}"))?;
        *current = value.to_owned();
        Ok(())
    }

    pub fn apply_update(&mut self, surface: Surface) {
        let mut state = surface.fields.clone();
        for (field, value) in &self.state {
            if let Some(next) = state.get_mut(field) {
                *next = value.clone();
            }
        }
        self.surface = surface;
        self.state = state;
    }

    pub fn invoke(&mut self, invocation: ActionInvocation) -> anyhow::Result<ActionReceipt> {
        if let Some(receipt) = self.receipts.get(&invocation.invocation_id) {
            return Ok(receipt.clone());
        }
        self.surface
            .action(&invocation.action, &invocation.expense_id)
            .context("action not declared by accepted surface")?;
        let receipt = ActionReceipt {
            invocation_id: invocation.invocation_id.clone(),
            action: invocation.action,
            expense_id: invocation.expense_id,
            sequence: self.receipts.len() as u64 + 1,
            outcome: "approved".into(),
        };
        self.receipts
            .insert(invocation.invocation_id, receipt.clone());
        Ok(receipt)
    }

    pub fn effect_count(&self) -> usize {
        self.receipts.len()
    }

    pub fn snapshot(&self) -> ReplaySnapshot {
        ReplaySnapshot {
            surface: self.surface.clone(),
            state: self.state.clone(),
        }
    }
}
