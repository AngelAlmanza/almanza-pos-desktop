use crate::db::Database;
use crate::models::category::Category;
use rusqlite::params;

pub fn find_all(db: &Database) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, created_at FROM categories ORDER BY name")
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(categories)
}

pub fn find_by_id(db: &Database, id: i64) -> Result<Option<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn
        .query_row(
            "SELECT id, name, description, created_at FROM categories WHERE id = ?1",
            params![id],
            |row| {
                Ok(Category {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        )
        .ok();

    Ok(result)
}

pub fn find_by_name(db: &Database, name: &str) -> Result<Option<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let result = conn.query_row("SELECT id, name, description, created_at FROM categories WHERE name = ?1", params![name], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).ok();
    Ok(result)
}

pub fn create(db: &Database, name: &str, description: Option<&str>) -> Result<Category, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO categories (name, description) VALUES (?1, ?2)",
        params![name, description],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    drop(conn);
    find_by_id(db, id)?.ok_or_else(|| "Failed to retrieve created category".to_string())
}

pub fn update(db: &Database, id: i64, name: Option<&str>, description: Option<&str>) -> Result<Category, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(val) = name {
        conn.execute("UPDATE categories SET name = ?1 WHERE id = ?2", params![val, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = description {
        conn.execute("UPDATE categories SET description = ?1 WHERE id = ?2", params![val, id])
            .map_err(|e| e.to_string())?;
    }

    drop(conn);
    find_by_id(db, id)?.ok_or_else(|| "Category not found".to_string())
}

pub fn delete(db: &Database, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
