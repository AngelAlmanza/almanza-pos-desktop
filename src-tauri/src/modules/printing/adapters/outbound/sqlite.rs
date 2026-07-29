use crate::infrastructure::sqlite::Database;
use crate::modules::printing::application::{PrintingSettingsRepository, SaleReader};
use crate::modules::sales::adapters::outbound::sqlite::SqliteSalesRepository;
use crate::modules::sales::application::SalesQueryPort;
use crate::shared::error::AppResult;
use std::collections::HashMap;

pub struct SqlitePrintingSettingsRepository<'db> {
    db: &'db Database,
}

impl<'db> SqlitePrintingSettingsRepository<'db> {
    pub fn new(db: &'db Database) -> Self {
        Self { db }
    }
}

impl PrintingSettingsRepository for SqlitePrintingSettingsRepository<'_> {
    fn find_values(&self, keys: &[&str]) -> AppResult<HashMap<String, Option<String>>> {
        let conn = self.db.conn.lock()?;
        let mut values = HashMap::with_capacity(keys.len());
        for key in keys {
            let value = conn
                .query_row("SELECT value FROM settings WHERE key = ?1", [*key], |row| {
                    row.get::<_, Option<String>>(0)
                })
                .ok()
                .flatten();
            values.insert((*key).to_string(), value);
        }
        Ok(values)
    }

    fn upsert_value(&self, key: &str, value: Option<&str>) -> AppResult<()> {
        let conn = self.db.conn.lock()?;
        conn.execute(
            "INSERT INTO settings (key, value, value_type, label, group_name, sort_order, created_at, updated_at) \
             VALUES (?1, ?2, 'string', ?1, 'printer', 0, datetime('now', 'localtime'), datetime('now', 'localtime')) \
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }
}

impl SaleReader for SqliteSalesRepository<'_> {
    fn find_sale(&self, id: i64) -> AppResult<Option<crate::models::sale::Sale>> {
        SalesQueryPort::find_sale(self, id)
    }
}
