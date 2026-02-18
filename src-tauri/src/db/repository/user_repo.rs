use crate::db::Database;
use crate::models::user::User;
use rusqlite::params;

pub fn find_all(db: &Database) -> Result<Vec<User>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, username, full_name, role, active, created_at, updated_at FROM users ORDER BY id",
        )
        .map_err(|e| e.to_string())?;

    let users = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                role: row.get(3)?,
                active: row.get::<_, i32>(4)? == 1,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(users)
}

pub fn find_by_id(db: &Database, id: i64) -> Result<Option<User>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, username, full_name, role, active, created_at, updated_at FROM users WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let user = stmt
        .query_row(params![id], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                role: row.get(3)?,
                active: row.get::<_, i32>(4)? == 1,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .ok();

    Ok(user)
}

pub fn find_by_username(db: &Database, username: &str) -> Result<Option<(User, String)>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, username, password_hash, full_name, role, active, created_at, updated_at FROM users WHERE username = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![username], |row| {
            Ok((
                User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    full_name: row.get(3)?,
                    role: row.get(4)?,
                    active: row.get::<_, i32>(5)? == 1,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                },
                row.get::<_, String>(2)?,
            ))
        })
        .ok();

    Ok(result)
}

pub fn create(db: &Database, username: &str, password_hash: &str, full_name: &str, role: &str) -> Result<User, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES (?1, ?2, ?3, ?4)",
        params![username, password_hash, full_name, role],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    drop(conn);

    find_by_id(db, id)?.ok_or_else(|| "Failed to retrieve created user".to_string())
}

pub fn update(
    db: &Database,
    id: i64,
    username: Option<&str>,
    password_hash: Option<&str>,
    full_name: Option<&str>,
    role: Option<&str>,
    active: Option<bool>,
) -> Result<User, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(val) = username {
        conn.execute("UPDATE users SET username = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2", params![val, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = password_hash {
        conn.execute("UPDATE users SET password_hash = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2", params![val, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = full_name {
        conn.execute("UPDATE users SET full_name = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2", params![val, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = role {
        conn.execute("UPDATE users SET role = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2", params![val, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = active {
        let active_int = if val { 1 } else { 0 };
        conn.execute("UPDATE users SET active = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2", params![active_int, id])
            .map_err(|e| e.to_string())?;
    }

    drop(conn);
    find_by_id(db, id)?.ok_or_else(|| "User not found".to_string())
}

pub fn delete(db: &Database, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Una sola consulta con EXISTS para verificar todas las dependencias.
    // EXISTS cortocircuita al primer registro encontrado, lo que la hace óptima.
    let (has_sessions, has_sales, has_inventory): (i32, i32, i32) = conn
        .query_row(
            "SELECT
                EXISTS(SELECT 1 FROM cash_register_sessions WHERE user_id = ?1 LIMIT 1),
                EXISTS(SELECT 1 FROM sales WHERE user_id = ?1 LIMIT 1),
                EXISTS(SELECT 1 FROM inventory_adjustments WHERE user_id = ?1 LIMIT 1)",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    if has_sessions == 1 {
        return Err("No se puede eliminar el usuario porque tiene sesiones de caja registradas.".to_string());
    }
    if has_sales == 1 {
        return Err("No se puede eliminar el usuario porque tiene ventas registradas.".to_string());
    }
    if has_inventory == 1 {
        return Err("No se puede eliminar el usuario porque tiene ajustes de inventario registrados.".to_string());
    }

    conn.execute("DELETE FROM users WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
