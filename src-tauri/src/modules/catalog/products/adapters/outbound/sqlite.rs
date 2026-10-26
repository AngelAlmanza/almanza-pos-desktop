use crate::infrastructure::sqlite::Database;
use crate::models::product::Product;
use crate::modules::catalog::products::application::{ImageFileUpdate, ProductRepository};
use crate::shared::error::{AppError, AppResult};
use rusqlite::params;

pub struct SqliteProductRepository<'db> {
    db: &'db Database,
}

impl<'db> SqliteProductRepository<'db> {
    pub fn new(db: &'db Database) -> Self {
        Self { db }
    }
}

impl ProductRepository for SqliteProductRepository<'_> {
    fn find_all(&self) -> AppResult<Vec<Product>> {
        find_all(self.db)
    }

    fn find_active(&self) -> AppResult<Vec<Product>> {
        find_active(self.db)
    }

    fn find_by_id(&self, id: i64) -> AppResult<Option<Product>> {
        find_by_id(self.db, id)
    }

    fn find_by_barcode(&self, barcode: &str) -> AppResult<Option<Product>> {
        find_by_barcode(self.db, barcode)
    }

    fn search(&self, term: &str) -> AppResult<Vec<Product>> {
        search(self.db, term)
    }

    fn create(
        &self,
        request: &crate::models::product::CreateProductRequest,
        image_file: Option<&str>,
    ) -> AppResult<Product> {
        create(
            self.db,
            &request.name,
            request.description.as_deref(),
            request.barcode.as_deref(),
            request.price,
            &request.unit,
            request.is_bulk,
            request.category_id,
            request.stock.unwrap_or(0.0),
            request.min_stock.unwrap_or(0.0),
            image_file,
        )
    }

    fn update(
        &self,
        request: &crate::models::product::UpdateProductRequest,
        image: ImageFileUpdate,
    ) -> AppResult<Product> {
        update(
            self.db,
            request.id,
            request.name.as_deref(),
            request.description.as_deref(),
            request.barcode.as_deref(),
            request.price,
            request.unit.as_deref(),
            request.is_bulk,
            request.category_id,
            request.min_stock,
            request.active,
            image,
        )
    }

    fn delete(&self, id: i64) -> AppResult<()> {
        delete(self.db, id)
    }
}

fn row_to_product(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        barcode: row.get(3)?,
        price: row.get(4)?,
        unit: row.get(5)?,
        is_bulk: row.get::<_, i32>(6)? == 1,
        category_id: row.get(7)?,
        category_name: row.get(8)?,
        stock: row.get(9)?,
        min_stock: row.get(10)?,
        active: row.get::<_, i32>(11)? == 1,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
        image_file: row.get(14)?,
    })
}

const SELECT_QUERY: &str = "\
    SELECT p.id, p.name, p.description, p.barcode, p.price, p.unit, p.is_bulk, \
        p.category_id, c.name as category_name, p.stock, p.min_stock, \
        p.active, p.created_at, p.updated_at, p.image_file \
    FROM products p LEFT JOIN categories c ON p.category_id = c.id";

pub fn find_all(db: &Database) -> AppResult<Vec<Product>> {
    let conn = db.conn.lock()?;
    let query = format!("{} ORDER BY p.name", SELECT_QUERY);
    let mut stmt = conn.prepare(&query)?;

    let products = stmt
        .query_map([], row_to_product)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(products)
}

pub fn find_active(db: &Database) -> AppResult<Vec<Product>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE p.active = 1 ORDER BY p.name", SELECT_QUERY);
    let mut stmt = conn.prepare(&query)?;

    let products = stmt
        .query_map([], row_to_product)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(products)
}

pub fn find_by_id(db: &Database, id: i64) -> AppResult<Option<Product>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE p.id = ?1", SELECT_QUERY);
    let result = conn.query_row(&query, params![id], row_to_product).ok();
    Ok(result)
}

pub fn find_by_barcode(db: &Database, barcode: &str) -> AppResult<Option<Product>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE p.barcode = ?1 AND p.active = 1", SELECT_QUERY);
    let result = conn
        .query_row(&query, params![barcode], row_to_product)
        .ok();
    Ok(result)
}

pub fn search(db: &Database, term: &str) -> AppResult<Vec<Product>> {
    let conn = db.conn.lock()?;
    let query = format!(
        "{} WHERE p.active = 1 AND (p.name LIKE ?1 OR p.barcode LIKE ?1) ORDER BY p.name LIMIT {}",
        SELECT_QUERY,
        crate::constants::SEARCH_RESULT_LIMIT,
    );
    let search_term = format!("%{}%", term);
    let mut stmt = conn.prepare(&query)?;

    let products = stmt
        .query_map(params![search_term], row_to_product)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(products)
}

pub fn create(
    db: &Database,
    name: &str,
    description: Option<&str>,
    barcode: Option<&str>,
    price: f64,
    unit: &str,
    is_bulk: bool,
    category_id: Option<i64>,
    stock: f64,
    min_stock: f64,
    image_file: Option<&str>,
) -> AppResult<Product> {
    let conn = db.conn.lock()?;
    conn.execute(
        "INSERT INTO products (name, description, barcode, price, unit, is_bulk, category_id, stock, min_stock, image_file) \
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![name, description, barcode, price, unit, is_bulk, category_id, stock, min_stock, image_file],
    )?;

    let id = conn.last_insert_rowid();
    drop(conn);
    find_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound("Failed to retrieve created product".to_string()))
}

pub fn update(
    db: &Database,
    id: i64,
    name: Option<&str>,
    description: Option<&str>,
    barcode: Option<&str>,
    price: Option<f64>,
    unit: Option<&str>,
    is_bulk: Option<bool>,
    category_id: Option<i64>,
    min_stock: Option<f64>,
    active: Option<bool>,
    image: ImageFileUpdate,
) -> AppResult<Product> {
    let guard = db.conn.lock()?;
    // BR2.2: todas las escrituras del producto van en una sola transacción;
    // si una falla, el `Drop` de la transacción las revierte.
    let tx = guard.unchecked_transaction()?;
    let conn = &tx;

    if let Some(val) = name {
        conn.execute(
            "UPDATE products SET name = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = description {
        conn.execute(
            "UPDATE products SET description = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = barcode {
        conn.execute(
            "UPDATE products SET barcode = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = price {
        conn.execute(
            "UPDATE products SET price = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = unit {
        conn.execute(
            "UPDATE products SET unit = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = is_bulk {
        let is_bulk_int = if val { 1 } else { 0 };
        conn.execute(
            "UPDATE products SET is_bulk = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![is_bulk_int, id],
        )?;
    }
    if category_id.is_some() {
        conn.execute(
            "UPDATE products SET category_id = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![category_id, id],
        )?;
    }
    if let Some(val) = min_stock {
        conn.execute(
            "UPDATE products SET min_stock = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![val, id],
        )?;
    }
    if let Some(val) = active {
        let active_int = if val { 1 } else { 0 };
        conn.execute(
            "UPDATE products SET active = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![active_int, id],
        )?;
    }
    match &image {
        ImageFileUpdate::Keep => {}
        ImageFileUpdate::Set(file) => {
            conn.execute(
                "UPDATE products SET image_file = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![file, id],
            )?;
        }
        ImageFileUpdate::Clear => {
            conn.execute(
                "UPDATE products SET image_file = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?1",
                params![id],
            )?;
        }
    }

    tx.commit()?;
    drop(guard);
    find_by_id(db, id)?.ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))
}

pub fn delete(db: &Database, id: i64) -> AppResult<()> {
    let conn = db.conn.lock()?;

    // EXISTS short-circuits on the first matching row, making both checks optimal.
    // inventory_adjustments uses idx_inventory_product (product_id).
    let (has_sale_items, has_inventory): (i32, i32) = conn.query_row(
        "SELECT \
            EXISTS(SELECT 1 FROM sale_items WHERE product_id = ?1 LIMIT 1), \
            EXISTS(SELECT 1 FROM inventory_adjustments WHERE product_id = ?1 LIMIT 1)",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    if has_sale_items == 1 {
        return Err(AppError::Conflict(
            "No se puede eliminar el producto porque está asociado a ventas registradas."
                .to_string(),
        ));
    }
    if has_inventory == 1 {
        return Err(AppError::Conflict(
            "No se puede eliminar el producto porque tiene ajustes de inventario registrados."
                .to_string(),
        ));
    }

    conn.execute("DELETE FROM products WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{create, delete, find_by_id, update};
    use crate::infrastructure::sqlite::Database;
    use crate::modules::catalog::products::application::ImageFileUpdate;
    use rusqlite::Connection;
    use std::sync::Mutex;

    fn test_database() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE categories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            );
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                barcode TEXT,
                price REAL NOT NULL,
                unit TEXT NOT NULL,
                is_bulk INTEGER NOT NULL DEFAULT 0,
                category_id INTEGER,
                stock REAL NOT NULL DEFAULT 0,
                min_stock REAL NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00',
                updated_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00',
                image_file TEXT
            );
            CREATE UNIQUE INDEX idx_products_image_file ON products(image_file) WHERE image_file IS NOT NULL;
            CREATE TABLE sale_items (product_id INTEGER);
            CREATE TABLE inventory_adjustments (product_id INTEGER);",
        )
        .unwrap();

        Database {
            conn: Mutex::new(conn),
        }
    }

    #[test]
    fn creates_and_updates_the_explicit_bulk_flag() {
        let db = test_database();
        let created = create(&db, "Tomate", None, None, 42.50, "kg", true, None, 5.0, 0.5, None)
            .unwrap();
        assert!(created.is_bulk);

        let updated = update_with(&db, created.id, None, Some(false), ImageFileUpdate::Keep)
            .unwrap();
        assert!(!updated.is_bulk);
        assert_eq!(updated.unit, "kg");
    }

    fn update_with(
        db: &Database,
        id: i64,
        name: Option<&str>,
        is_bulk: Option<bool>,
        image: ImageFileUpdate,
    ) -> crate::shared::error::AppResult<crate::models::product::Product> {
        update(
            db, id, name, None, None, None, None, is_bulk, None, None, None, image,
        )
    }

    fn new_product(db: &Database, name: &str, image: Option<&str>) -> i64 {
        create(db, name, None, None, 1.0, "pieza", false, None, 0.0, 0.0, image)
            .unwrap()
            .id
    }

    #[test]
    fn creates_a_product_with_an_image_and_reads_it_back() {
        let db = test_database();
        let created = create(&db, "Leche", None, None, 20.0, "pieza", false, None, 0.0, 0.0, Some("a.png"))
            .unwrap();
        assert_eq!(created.image_file.as_deref(), Some("a.png"));
        let found = find_by_id(&db, created.id).unwrap().unwrap();
        assert_eq!(found.image_file.as_deref(), Some("a.png"));
    }

    #[test]
    fn products_without_image_have_a_null_image_file() {
        let db = test_database();
        let id = new_product(&db, "Pan", None);
        assert!(find_by_id(&db, id).unwrap().unwrap().image_file.is_none());
    }

    #[test]
    fn update_sets_clears_and_keeps_the_image_file() {
        let db = test_database();
        let id = new_product(&db, "Pan", None);

        let set = update_with(&db, id, None, None, ImageFileUpdate::Set("n.webp".into())).unwrap();
        assert_eq!(set.image_file.as_deref(), Some("n.webp"));

        let kept = update_with(&db, id, Some("Pan dulce"), None, ImageFileUpdate::Keep).unwrap();
        assert_eq!(kept.image_file.as_deref(), Some("n.webp"));
        assert_eq!(kept.name, "Pan dulce");

        let cleared = update_with(&db, id, None, None, ImageFileUpdate::Clear).unwrap();
        assert!(cleared.image_file.is_none());
    }

    #[test]
    fn a_failed_update_rolls_back_every_field_of_the_transaction() {
        let db = test_database();
        let first = new_product(&db, "Uno", Some("dup.png"));
        let second = new_product(&db, "Dos", None);

        // El nombre se escribe antes de la imagen; la imagen duplicada falla por el índice único.
        let result = update_with(
            &db,
            second,
            Some("Renombrado"),
            None,
            ImageFileUpdate::Set("dup.png".into()),
        );
        assert!(result.is_err());

        let unchanged = find_by_id(&db, second).unwrap().unwrap();
        assert_eq!(unchanged.name, "Dos");
        assert!(unchanged.image_file.is_none());
        let other = find_by_id(&db, first).unwrap().unwrap();
        assert_eq!(other.image_file.as_deref(), Some("dup.png"));
    }

    #[test]
    fn deleting_a_product_with_sales_changes_nothing() {
        let db = test_database();
        let id = new_product(&db, "Vendido", Some("keep.png"));
        db.conn
            .lock()
            .unwrap()
            .execute("INSERT INTO sale_items (product_id) VALUES (?1)", [id])
            .unwrap();

        assert!(delete(&db, id).is_err());
        let still = find_by_id(&db, id).unwrap().unwrap();
        assert_eq!(still.image_file.as_deref(), Some("keep.png"));
    }

    #[test]
    fn deleting_a_free_product_removes_the_row() {
        let db = test_database();
        let id = new_product(&db, "Libre", Some("free.png"));
        delete(&db, id).unwrap();
        assert!(find_by_id(&db, id).unwrap().is_none());
    }
}
