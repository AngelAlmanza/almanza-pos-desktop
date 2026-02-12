use crate::db::Database;
use crate::models::inventory::InventoryAdjustment;
use rusqlite::params;

pub fn find_all(db: &Database) -> Result<Vec<InventoryAdjustment>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT ia.id, ia.product_id, p.name, ia.user_id, u.full_name, ia.adjustment_type, ia.quantity, ia.previous_stock, ia.new_stock, ia.reason, ia.created_at FROM inventory_adjustments ia JOIN products p ON ia.product_id = p.id JOIN users u ON ia.user_id = u.id ORDER BY ia.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let adjustments = stmt
        .query_map([], |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(adjustments)
}

pub fn find_by_product(db: &Database, product_id: i64) -> Result<Vec<InventoryAdjustment>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT ia.id, ia.product_id, p.name, ia.user_id, u.full_name, ia.adjustment_type, ia.quantity, ia.previous_stock, ia.new_stock, ia.reason, ia.created_at FROM inventory_adjustments ia JOIN products p ON ia.product_id = p.id JOIN users u ON ia.user_id = u.id WHERE ia.product_id = ?1 ORDER BY ia.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let adjustments = stmt
        .query_map(params![product_id], |row| {
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
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(adjustments)
}

pub fn create(
    db: &Database,
    product_id: i64,
    user_id: i64,
    adjustment_type: &str,
    quantity: f64,
    reason: Option<&str>,
) -> Result<InventoryAdjustment, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Get current stock
    let current_stock: f64 = conn
        .query_row(
            "SELECT stock FROM products WHERE id = ?1",
            params![product_id],
            |row| row.get(0),
        )
        .map_err(|_| "Producto no encontrado".to_string())?;

    let new_stock = match adjustment_type {
        "add" | "positive" => current_stock + quantity,
        "negative" => {
            if current_stock < quantity {
                return Err("Stock insuficiente para el ajuste negativo".to_string());
            }
            current_stock - quantity
        }
        _ => return Err("Tipo de ajuste inválido".to_string()),
    };

    conn.execute(
        "INSERT INTO inventory_adjustments (product_id, user_id, adjustment_type, quantity, previous_stock, new_stock, reason) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![product_id, user_id, adjustment_type, quantity, current_stock, new_stock, reason],
    )
    .map_err(|e| e.to_string())?;

    // Update product stock
    conn.execute(
        "UPDATE products SET stock = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
        params![new_stock, product_id],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Return the created adjustment
    let adj = conn
        .query_row(
            "SELECT ia.id, ia.product_id, p.name, ia.user_id, u.full_name, ia.adjustment_type, ia.quantity, ia.previous_stock, ia.new_stock, ia.reason, ia.created_at FROM inventory_adjustments ia JOIN products p ON ia.product_id = p.id JOIN users u ON ia.user_id = u.id WHERE ia.id = ?1",
            params![id],
            |row| {
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
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(adj)
}
