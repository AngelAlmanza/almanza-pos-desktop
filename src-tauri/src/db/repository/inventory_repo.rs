use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::inventory::{AdjustmentType, InventoryAdjustment};
use crate::utils::money;
use rusqlite::params;

const SELECT_QUERY: &str = "\
    SELECT ia.id, ia.product_id, p.name, ia.user_id, u.full_name, \
           ia.adjustment_type, ia.quantity, ia.previous_stock, ia.new_stock, \
           ia.reason, ia.created_at \
    FROM inventory_adjustments ia \
    JOIN products p ON ia.product_id = p.id \
    JOIN users u ON ia.user_id = u.id";

fn row_to_adjustment(row: &rusqlite::Row) -> rusqlite::Result<InventoryAdjustment> {
    Ok(InventoryAdjustment {
        id: row.get(0)?,
        product_id: row.get(1)?,
        product_name: row.get(2)?,
        user_id: row.get(3)?,
        user_name: row.get(4)?,
        adjustment_type: row.get(5)?,
        quantity: row.get(6)?,
        previous_stock: row.get(7)?,
        new_stock: row.get(8)?,
        reason: row.get(9)?,
        created_at: row.get(10)?,
    })
}

pub fn find_all(db: &Database) -> AppResult<Vec<InventoryAdjustment>> {
    let conn = db.conn.lock()?;
    let query = format!("{} ORDER BY ia.id DESC", SELECT_QUERY);
    let mut stmt = conn.prepare(&query)?;

    let adjustments = stmt
        .query_map([], row_to_adjustment)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(adjustments)
}

pub fn find_by_date_range_paginated(
    db: &Database,
    start_date: &str,
    end_date: &str,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<InventoryAdjustment>, i64)> {
    let conn = db.conn.lock()?;

    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM inventory_adjustments ia \
         WHERE ia.created_at >= ?1 AND ia.created_at <= ?2",
        params![start_date, end_date],
        |row| row.get(0),
    )?;

    let offset = (page - 1) * page_size;
    let query = format!(
        "{} WHERE ia.created_at >= ?1 AND ia.created_at <= ?2 ORDER BY ia.id DESC LIMIT ?3 OFFSET ?4",
        SELECT_QUERY
    );
    let mut stmt = conn.prepare(&query)?;

    let adjustments = stmt
        .query_map(params![start_date, end_date, page_size, offset], row_to_adjustment)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok((adjustments, total))
}

pub fn find_by_product(db: &Database, product_id: i64) -> AppResult<Vec<InventoryAdjustment>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE ia.product_id = ?1 ORDER BY ia.id DESC", SELECT_QUERY);
    let mut stmt = conn.prepare(&query)?;

    let adjustments = stmt
        .query_map(params![product_id], row_to_adjustment)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(adjustments)
}

pub fn create(
    db: &Database,
    product_id: i64,
    user_id: i64,
    adjustment_type: AdjustmentType,
    quantity: f64,
    reason: Option<&str>,
) -> AppResult<InventoryAdjustment> {
    let mut conn = db.conn.lock()?;

    // Read current stock before the transaction so the statement borrow does not
    // conflict with the mutable borrow required by conn.transaction().
    let current_stock: f64 = conn
        .query_row(
            "SELECT stock FROM products WHERE id = ?1",
            params![product_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound("Producto no encontrado".to_string()))?;

    let quantity = money::round3(quantity);
    let new_stock = if adjustment_type.is_positive() {
        money::round3(current_stock + quantity)
    } else {
        if current_stock < quantity {
            return Err(AppError::Validation(
                "Stock insuficiente para el ajuste negativo".to_string(),
            ));
        }
        money::round3(current_stock - quantity)
    };

    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO inventory_adjustments \
             (product_id, user_id, adjustment_type, quantity, previous_stock, new_stock, reason) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![product_id, user_id, adjustment_type, quantity, current_stock, new_stock, reason],
    )?;

    let id = tx.last_insert_rowid();

    tx.execute(
        "UPDATE products SET stock = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
        params![new_stock, product_id],
    )?;

    tx.commit()?;

    // Return the created adjustment (conn is no longer borrowed by the transaction).
    let adj = conn.query_row(
        &format!("{} WHERE ia.id = ?1", SELECT_QUERY),
        params![id],
        row_to_adjustment,
    )?;

    Ok(adj)
}
