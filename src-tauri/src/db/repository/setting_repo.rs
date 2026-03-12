use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::setting::{CreateSettingRequest, Setting};
use rusqlite::params;

const SELECT_QUERY: &str = "SELECT key, value, value_type, label, description, group_name, sort_order, created_at, updated_at FROM settings";

fn row_to_setting(row: &rusqlite::Row) -> rusqlite::Result<Setting> {
    Ok(Setting {
        key: row.get(0)?,
        value: row.get(1)?,
        value_type: row.get(2)?,
        label: row.get(3)?,
        description: row.get(4)?,
        group_name: row.get(5)?,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn find_all(db: &Database) -> AppResult<Vec<Setting>> {
    let conn = db.conn.lock()?;
    let mut stmt = conn.prepare(&format!("{} ORDER BY group_name, sort_order, key", SELECT_QUERY))?;
    let settings = stmt
        .query_map([], row_to_setting)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(settings)
}

pub fn find_by_key(db: &Database, key: &str) -> AppResult<Option<Setting>> {
    let conn = db.conn.lock()?;
    let result = conn
        .query_row(
            &format!("{} WHERE key = ?1", SELECT_QUERY),
            params![key],
            row_to_setting,
        )
        .ok();
    Ok(result)
}

pub fn update(db: &Database, key: &str, value: Option<&str>) -> AppResult<Setting> {
    let conn = db.conn.lock()?;
    let rows = conn.execute(
        "UPDATE settings SET value = ?1, updated_at = datetime('now', 'localtime') WHERE key = ?2",
        params![value, key],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound(format!(
            "Configuración '{}' no encontrada",
            key
        )));
    }
    drop(conn);
    find_by_key(db, key)?
        .ok_or_else(|| AppError::NotFound(format!("Configuración '{}' no encontrada", key)))
}

pub fn update_path(db: &Database, key: &str, path: &str) -> AppResult<()> {
    let conn = db.conn.lock()?;
    conn.execute(
        "UPDATE settings SET value = ?1, updated_at = datetime('now', 'localtime') WHERE key = ?2",
        params![path, key],
    )?;
    Ok(())
}

pub fn create(db: &Database, req: &CreateSettingRequest) -> AppResult<Setting> {
    let conn = db.conn.lock()?;
    conn.execute(
        "INSERT INTO settings (key, value, value_type, label, description, group_name, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            req.key,
            req.value,
            req.value_type,
            req.label,
            req.description,
            req.group_name,
            req.sort_order.unwrap_or(0)
        ],
    )?;
    drop(conn);
    find_by_key(db, &req.key)?
        .ok_or_else(|| AppError::Database("Error al crear configuración".to_string()))
}

pub fn delete(db: &Database, key: &str) -> AppResult<()> {
    let conn = db.conn.lock()?;
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
    Ok(())
}
