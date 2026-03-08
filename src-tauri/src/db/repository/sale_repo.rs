use crate::db::Database;
use crate::models::sale::{Sale, SaleItem, TopProduct};
use rusqlite::params;

const SALE_SELECT: &str = "\
    SELECT s.id, s.cash_register_session_id, s.user_id, u.full_name, \
            s.total, s.payment_method, s.payment_amount, \
            s.payment_cash_mxn, s.payment_cash_usd, s.payment_transfer, \
            s.exchange_rate, s.change_amount, s.status, s.created_at \
    FROM sales s JOIN users u ON s.user_id = u.id";

fn row_to_sale(row: &rusqlite::Row) -> rusqlite::Result<Sale> {
    Ok(Sale {
        id: row.get(0)?,
        cash_register_session_id: row.get(1)?,
        user_id: row.get(2)?,
        user_name: row.get(3)?,
        total: row.get(4)?,
        payment_method: row.get(5)?,
        payment_amount: row.get(6)?,
        payment_cash_mxn: row.get(7)?,
        payment_cash_usd: row.get(8)?,
        payment_transfer: row.get(9)?,
        exchange_rate: row.get(10)?,
        change_amount: row.get(11)?,
        status: row.get(12)?,
        created_at: row.get(13)?,
        items: Vec::new(),
    })
}

fn load_items_for_sales(
    conn: &rusqlite::Connection,
    sales: Vec<Sale>,
) -> Result<Vec<Sale>, String> {
    let mut result = Vec::with_capacity(sales.len());
    for mut sale in sales {
        sale.items = find_sale_items_by_sale_id(conn, sale.id)?;
        result.push(sale);
    }
    Ok(result)
}

pub fn create(
    db: &Database,
    cash_register_session_id: i64,
    user_id: i64,
    total: f64,
    payment_method: &str,
    payment_amount: f64,
    payment_cash_mxn: f64,
    payment_cash_usd: f64,
    payment_transfer: f64,
    exchange_rate: Option<f64>,
    change_amount: f64,
    items: &[(i64, String, f64, f64, f64)],
) -> Result<Sale, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO sales (cash_register_session_id, user_id, total, payment_method, payment_amount, \
            payment_cash_mxn, payment_cash_usd, payment_transfer, exchange_rate, change_amount) \
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            cash_register_session_id, user_id, total, payment_method, payment_amount,
            payment_cash_mxn, payment_cash_usd, payment_transfer, exchange_rate, change_amount
        ],
    )
    .map_err(|e| e.to_string())?;

    let sale_id = tx.last_insert_rowid();

    for item in items {
        tx.execute(
            "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) \
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![sale_id, item.0, item.1, item.2, item.3, item.4],
        )
        .map_err(|e| e.to_string())?;

        tx.execute(
            "UPDATE products SET stock = stock - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![item.2, item.0],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    drop(conn);
    find_by_id(db, sale_id)?.ok_or_else(|| "Failed to retrieve created sale".to_string())
}

pub fn find_by_id(db: &Database, id: i64) -> Result<Option<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!("{} WHERE s.id = ?1", SALE_SELECT);
    let sale = conn.query_row(&query, params![id], row_to_sale).ok();

    if let Some(mut sale) = sale {
        sale.items = find_sale_items_by_sale_id(&conn, sale.id)?;
        Ok(Some(sale))
    } else {
        Ok(None)
    }
}

pub fn find_by_session(db: &Database, session_id: i64) -> Result<Vec<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!(
        "{} WHERE s.cash_register_session_id = ?1 ORDER BY s.id DESC",
        SALE_SELECT
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let sales = stmt
        .query_map(params![session_id], row_to_sale)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    load_items_for_sales(&conn, sales)
}

pub fn find_all(db: &Database) -> Result<Vec<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!("{} ORDER BY s.id DESC", SALE_SELECT);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let sales = stmt
        .query_map([], row_to_sale)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    load_items_for_sales(&conn, sales)
}

pub fn find_sale_items_by_sale_id(
    conn: &rusqlite::Connection,
    sale_id: i64,
) -> Result<Vec<SaleItem>, String> {
    let mut stmt = conn
        .prepare("SELECT id, sale_id, product_id, product_name, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ?1")
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![sale_id], |row| {
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

    Ok(items)
}

pub fn find_by_date_range(
    db: &Database,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<Sale>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!(
        "{} WHERE s.created_at >= ?1 AND s.created_at <= ?2 ORDER BY s.id DESC",
        SALE_SELECT
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let sales = stmt
        .query_map(params![start_date, end_date], row_to_sale)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    load_items_for_sales(&conn, sales)
}

pub fn get_top_products(
    db: &Database,
    start_date: &str,
    end_date: &str,
    limit: i64,
) -> Result<Vec<TopProduct>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT si.product_id, si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_rev \
                FROM sale_items si JOIN sales s ON si.sale_id = s.id \
                WHERE s.created_at >= ?1 AND s.created_at <= ?2 AND s.status = 'completed' \
                GROUP BY si.product_id, si.product_name ORDER BY total_qty DESC LIMIT ?3",
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
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Read items before opening the transaction so the statement borrow doesn't
    // conflict with the mutable borrow required by conn.transaction().
    let items: Vec<(i64, f64)> = {
        let mut stmt = conn
            .prepare("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![sale_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        rows
    };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for (product_id, quantity) in items {
        tx.execute(
            "UPDATE products SET stock = stock + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![quantity, product_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.execute(
        "UPDATE sales SET status = 'cancelled' WHERE id = ?1",
        params![sale_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
