use crate::db::Database;
use crate::models::sale::{Sale, SaleItem, TopProduct};
use rusqlite::params;

pub fn create(
    db: &Database,
    cash_register_session_id: i64,
    user_id: i64,
    total: f64,
    payment_method: &str,
    payment_amount: f64,
    change_amount: f64,
    items: &[(i64, String, f64, f64, f64)], // (product_id, product_name, quantity, unit_price, subtotal)
) -> Result<Sale, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO sales (cash_register_session_id, user_id, total, payment_method, payment_amount, change_amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![cash_register_session_id, user_id, total, payment_method, payment_amount, change_amount],
    )
    .map_err(|e| e.to_string())?;

    let sale_id = conn.last_insert_rowid();

    for item in items {
        conn.execute(
            "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![sale_id, item.0, item.1, item.2, item.3, item.4],
        )
        .map_err(|e| e.to_string())?;

        // Update stock
        conn.execute(
            "UPDATE products SET stock = stock - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![item.2, item.0],
        )
        .map_err(|e| e.to_string())?;
    }

    drop(conn);
    find_by_id(db, sale_id)?.ok_or_else(|| "Failed to retrieve created sale".to_string())
}

pub fn find_by_id(db: &Database, id: i64) -> Result<Option<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let sale = conn
        .query_row(
            "SELECT s.id, s.cash_register_session_id, s.user_id, u.full_name, s.total, s.payment_method, s.payment_amount, s.change_amount, s.status, s.created_at FROM sales s JOIN users u ON s.user_id = u.id WHERE s.id = ?1",
            params![id],
            |row| {
                Ok(Sale {
                    id: row.get(0)?,
                    cash_register_session_id: row.get(1)?,
                    user_id: row.get(2)?,
                    user_name: row.get(3)?,
                    total: row.get(4)?,
                    payment_method: row.get(5)?,
                    payment_amount: row.get(6)?,
                    change_amount: row.get(7)?,
                    status: row.get(8)?,
                    created_at: row.get(9)?,
                    items: Vec::new(),
                })
            },
        )
        .ok();

    if let Some(mut sale) = sale {
        let mut stmt = conn
            .prepare("SELECT id, sale_id, product_id, product_name, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ?1")
            .map_err(|e| e.to_string())?;

        let items = stmt
            .query_map(params![sale.id], |row| {
                Ok(SaleItem {
                    id: row.get(0)?,
                    sale_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    quantity: row.get(4)?,
                    unit_price: row.get(5)?,
                    subtotal: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        sale.items = items;
        Ok(Some(sale))
    } else {
        Ok(None)
    }
}

pub fn find_by_session(db: &Database, session_id: i64) -> Result<Vec<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.cash_register_session_id, s.user_id, u.full_name, s.total, s.payment_method, s.payment_amount, s.change_amount, s.status, s.created_at FROM sales s JOIN users u ON s.user_id = u.id WHERE s.cash_register_session_id = ?1 ORDER BY s.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let sales = stmt
        .query_map(params![session_id], |row| {
            Ok(Sale {
                id: row.get(0)?,
                cash_register_session_id: row.get(1)?,
                user_id: row.get(2)?,
                user_name: row.get(3)?,
                total: row.get(4)?,
                payment_method: row.get(5)?,
                payment_amount: row.get(6)?,
                change_amount: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                items: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sales)
}

pub fn find_all(db: &Database) -> Result<Vec<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.cash_register_session_id, s.user_id, u.full_name, s.total, s.payment_method, s.payment_amount, s.change_amount, s.status, s.created_at FROM sales s JOIN users u ON s.user_id = u.id ORDER BY s.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let sales = stmt
        .query_map([], |row| {
            Ok(Sale {
                id: row.get(0)?,
                cash_register_session_id: row.get(1)?,
                user_id: row.get(2)?,
                user_name: row.get(3)?,
                total: row.get(4)?,
                payment_method: row.get(5)?,
                payment_amount: row.get(6)?,
                change_amount: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                items: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sales)
}

pub fn find_by_date_range(db: &Database, start_date: &str, end_date: &str) -> Result<Vec<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.cash_register_session_id, s.user_id, u.full_name, s.total, s.payment_method, s.payment_amount, s.change_amount, s.status, s.created_at FROM sales s JOIN users u ON s.user_id = u.id WHERE s.created_at >= ?1 AND s.created_at <= ?2 ORDER BY s.id DESC",
        )
        .map_err(|e| e.to_string())?;

    let sales = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(Sale {
                id: row.get(0)?,
                cash_register_session_id: row.get(1)?,
                user_id: row.get(2)?,
                user_name: row.get(3)?,
                total: row.get(4)?,
                payment_method: row.get(5)?,
                payment_amount: row.get(6)?,
                change_amount: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                items: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Load items for each sale
    let mut result = Vec::new();
    for mut sale in sales {
        let mut item_stmt = conn
            .prepare("SELECT id, sale_id, product_id, product_name, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ?1")
            .map_err(|e| e.to_string())?;

        let items = item_stmt
            .query_map(params![sale.id], |row| {
                Ok(SaleItem {
                    id: row.get(0)?,
                    sale_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    quantity: row.get(4)?,
                    unit_price: row.get(5)?,
                    subtotal: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        sale.items = items;
        result.push(sale);
    }

    Ok(result)
}

pub fn get_top_products(db: &Database, start_date: &str, end_date: &str, limit: i64) -> Result<Vec<TopProduct>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT si.product_id, si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_rev FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.created_at >= ?1 AND s.created_at <= ?2 AND s.status = 'completed' GROUP BY si.product_id, si.product_name ORDER BY total_qty DESC LIMIT ?3",
        )
        .map_err(|e| e.to_string())?;

    let products = stmt
        .query_map(params![start_date, end_date, limit], |row| {
            Ok(TopProduct {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                total_quantity: row.get(2)?,
                total_revenue: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(products)
}

pub fn cancel_sale(db: &Database, sale_id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Get sale items to restore stock
    let mut stmt = conn
        .prepare("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1")
        .map_err(|e| e.to_string())?;

    let items: Vec<(i64, f64)> = stmt
        .query_map(params![sale_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Restore stock
    for (product_id, quantity) in items {
        conn.execute(
            "UPDATE products SET stock = stock + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![quantity, product_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Mark sale as cancelled
    conn.execute(
        "UPDATE sales SET status = 'cancelled' WHERE id = ?1",
        params![sale_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
