use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::product::Product;
use rusqlite::params;

fn row_to_product(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        barcode: row.get(3)?,
        price: row.get(4)?,
        unit: row.get(5)?,
        category_id: row.get(6)?,
        category_name: row.get(7)?,
        stock: row.get(8)?,
        min_stock: row.get(9)?,
        active: row.get::<_, i32>(10)? == 1,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

const SELECT_QUERY: &str = "\
    SELECT p.id, p.name, p.description, p.barcode, p.price, p.unit, \
           p.category_id, c.name as category_name, p.stock, p.min_stock, \
           p.active, p.created_at, p.updated_at \
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
    let result = conn.query_row(&query, params![barcode], row_to_product).ok();
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
    category_id: Option<i64>,
    stock: f64,
    min_stock: f64,
) -> AppResult<Product> {
    let conn = db.conn.lock()?;
    conn.execute(
        "INSERT INTO products (name, description, barcode, price, unit, category_id, stock, min_stock) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![name, description, barcode, price, unit, category_id, stock, min_stock],
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
    category_id: Option<i64>,
    min_stock: Option<f64>,
    active: Option<bool>,
) -> AppResult<Product> {
    let conn = db.conn.lock()?;

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

    drop(conn);
    find_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))
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
