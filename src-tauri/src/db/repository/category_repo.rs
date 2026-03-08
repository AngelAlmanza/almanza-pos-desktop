use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::category::Category;
use rusqlite::params;

pub fn find_all(db: &Database) -> AppResult<Vec<Category>> {
    let conn = db.conn.lock()?;
    let mut stmt =
        conn.prepare("SELECT id, name, description, created_at FROM categories ORDER BY name")?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(categories)
}

pub fn find_by_id(db: &Database, id: i64) -> AppResult<Option<Category>> {
    let conn = db.conn.lock()?;
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

pub fn find_by_name(db: &Database, name: &str) -> AppResult<Option<Category>> {
    let conn = db.conn.lock()?;
    let result = conn
        .query_row(
            "SELECT id, name, description, created_at FROM categories WHERE name = ?1",
            params![name],
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

pub fn create(db: &Database, name: &str, description: Option<&str>) -> AppResult<Category> {
    let conn = db.conn.lock()?;
    conn.execute(
        "INSERT INTO categories (name, description) VALUES (?1, ?2)",
        params![name, description],
    )?;

    let id = conn.last_insert_rowid();
    drop(conn);
    find_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound("Failed to retrieve created category".to_string()))
}

pub fn update(
    db: &Database,
    id: i64,
    name: Option<&str>,
    description: Option<&str>,
) -> AppResult<Category> {
    let conn = db.conn.lock()?;

    if let Some(val) = name {
        conn.execute(
            "UPDATE categories SET name = ?1 WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = description {
        conn.execute(
            "UPDATE categories SET description = ?1 WHERE id = ?2",
            params![val, id],
        )?;
    }

    drop(conn);
    find_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound("Categoría no encontrada".to_string()))
}

pub fn delete(db: &Database, id: i64) -> AppResult<()> {
    let conn = db.conn.lock()?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
    Ok(())
}
