use crate::infrastructure::sqlite::Database;
use crate::models::category::Category;
use crate::modules::catalog::categories::application::CategoryRepository;
use crate::shared::error::{AppError, AppResult};
use rusqlite::params;

pub struct SqliteCategoryRepository<'db> {
    db: &'db Database,
}

impl<'db> SqliteCategoryRepository<'db> {
    pub fn new(db: &'db Database) -> Self {
        Self { db }
    }
}

impl CategoryRepository for SqliteCategoryRepository<'_> {
    fn find_all(&self) -> AppResult<Vec<Category>> {
        find_all(self.db)
    }

    fn find_by_id(&self, id: i64) -> AppResult<Option<Category>> {
        find_by_id(self.db, id)
    }

    fn find_by_name(&self, name: &str) -> AppResult<Option<Category>> {
        find_by_name(self.db, name)
    }

    fn create(&self, name: &str, description: Option<&str>) -> AppResult<Category> {
        create(self.db, name, description)
    }

    fn update(
        &self,
        id: i64,
        name: Option<&str>,
        description: Option<&str>,
    ) -> AppResult<Category> {
        update(self.db, id, name, description)
    }

    fn delete(&self, id: i64) -> AppResult<()> {
        delete(self.db, id)
    }
}

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
    find_by_id(db, id)?.ok_or_else(|| AppError::NotFound("Categoría no encontrada".to_string()))
}

pub fn delete(db: &Database, id: i64) -> AppResult<()> {
    let conn = db.conn.lock()?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
    Ok(())
}
