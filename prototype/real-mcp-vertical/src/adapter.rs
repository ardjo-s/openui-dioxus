use crate::Surface;

pub trait CatalogAdapter {
    fn build_id(&self) -> &'static str;
    /// Pure projection only. Catalogs receive no MCP client or action capability.
    fn render_text(&self, surface: &Surface) -> String;
}

pub struct LedgerCatalog;
pub struct CompactCatalog;

impl CatalogAdapter for LedgerCatalog {
    fn build_id(&self) -> &'static str {
        "ledger-catalog-v1"
    }
    fn render_text(&self, surface: &Surface) -> String {
        let rows = surface
            .expenses
            .iter()
            .map(|expense| {
                format!(
                    "{} | {} | {:.2} {} | {}",
                    expense.id,
                    expense.merchant,
                    expense.amount_cents as f64 / 100.0,
                    expense.currency,
                    expense.status
                )
            })
            .collect::<Vec<_>>()
            .join("\n");
        format!(
            "{}\n{}\nACTION: {}",
            surface.title, rows, surface.action_label
        )
    }
}

impl CatalogAdapter for CompactCatalog {
    fn build_id(&self) -> &'static str {
        "compact-catalog-v1"
    }
    fn render_text(&self, surface: &Surface) -> String {
        let total: u64 = surface
            .expenses
            .iter()
            .map(|expense| expense.amount_cents)
            .sum();
        format!(
            "{}: {} pending / {:.2} EUR — {}",
            surface.title,
            surface.expenses.len(),
            total as f64 / 100.0,
            surface.action_label
        )
    }
}
