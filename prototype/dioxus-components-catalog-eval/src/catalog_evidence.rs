//! Catalog-only replay and migration evidence helpers.
//!
//! This module is outside the canonical runtime. It can invoke only the closed
//! `CatalogAdapter` normalization seam; it accepts no model, network, tool,
//! navigation, or host-effect capability.

use anyhow::bail;
use serde::Serialize;

use crate::{CatalogAdapter, SurfaceRevision};

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
) -> anyhow::Result<SurfaceRevision> {
    adapter.normalize(source)
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
