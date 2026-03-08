use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::sale::{Sale, SaleItem, SaleStatus, TopProduct};
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

fn find_sale_items_by_sale_id(
    conn: &rusqlite::Connection,
    sale_id: i64,
) -> AppResult<Vec<SaleItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, sale_id, product_id, product_name, quantity, unit_price, subtotal \
         FROM sale_items WHERE sale_id = ?1",
    )?;

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
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(items)
}

fn load_items_for_sales(conn: &rusqlite::Connection, sales: Vec<Sale>) -> AppResult<Vec<Sale>> {
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
) -> AppResult<Sale> {
    let mut conn = db.conn.lock()?;
    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO sales (cash_register_session_id, user_id, total, payment_method, \
            payment_amount, payment_cash_mxn, payment_cash_usd, payment_transfer, \
            exchange_rate, change_amount) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            cash_register_session_id, user_id, total, payment_method, payment_amount,
            payment_cash_mxn, payment_cash_usd, payment_transfer, exchange_rate, change_amount
        ],
    )?;

    let sale_id = tx.last_insert_rowid();

    for item in items {
        tx.execute(
            "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![sale_id, item.0, item.1, item.2, item.3, item.4],
        )?;

        tx.execute(
            "UPDATE products SET stock = stock - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![item.2, item.0],
        )?;
    }

    tx.commit()?;
    drop(conn);
    find_by_id(db, sale_id)?
        .ok_or_else(|| AppError::NotFound("Failed to retrieve created sale".to_string()))
}

pub fn find_by_id(db: &Database, id: i64) -> AppResult<Option<Sale>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE s.id = ?1", SALE_SELECT);
    let sale = conn.query_row(&query, params![id], row_to_sale).ok();

    if let Some(mut sale) = sale {
        sale.items = find_sale_items_by_sale_id(&conn, sale.id)?;
        Ok(Some(sale))
    } else {
        Ok(None)
    }
}

pub fn find_all(db: &Database) -> AppResult<Vec<Sale>> {
    let conn = db.conn.lock()?;
    let query = format!("{} ORDER BY s.id DESC", SALE_SELECT);
    let mut stmt = conn.prepare(&query)?;

    let sales = stmt
        .query_map([], row_to_sale)?
        .collect::<Result<Vec<_>, _>>()?;

    load_items_for_sales(&conn, sales)
}

pub fn find_by_session_paginated(
    db: &Database,
    session_id: i64,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<Sale>, i64)> {
    let conn = db.conn.lock()?;

    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sales s WHERE s.cash_register_session_id = ?1",
        rusqlite::params![session_id],
        |row| row.get(0),
    )?;

    let query = format!(
        "{} WHERE s.cash_register_session_id = ?1 ORDER BY s.id DESC LIMIT ?2 OFFSET ?3",
        SALE_SELECT
    );
    let offset = (page - 1) * page_size;
    let mut stmt = conn.prepare(&query)?;

    let sales = stmt
        .query_map(params![session_id, page_size, offset], row_to_sale)?
        .collect::<Result<Vec<_>, _>>()?;

    let sales = load_items_for_sales(&conn, sales)?;
    Ok((sales, total))
}

pub fn find_by_date_range_paginated(
    db: &Database,
    start_date: &str,
    end_date: &str,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<Sale>, i64)> {
    let conn = db.conn.lock()?;

    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sales s WHERE s.created_at >= ?1 AND s.created_at <= ?2",
        params![start_date, end_date],
        |row| row.get(0),
    )?;

    let query = format!(
        "{} WHERE s.created_at >= ?1 AND s.created_at <= ?2 ORDER BY s.id DESC LIMIT ?3 OFFSET ?4",
        SALE_SELECT
    );
    let offset = (page - 1) * page_size;
    let mut stmt = conn.prepare(&query)?;

    let sales = stmt
        .query_map(params![start_date, end_date, page_size, offset], row_to_sale)?
        .collect::<Result<Vec<_>, _>>()?;

    let sales = load_items_for_sales(&conn, sales)?;
    Ok((sales, total))
}

pub fn find_by_date_range(
    db: &Database,
    start_date: &str,
    end_date: &str,
) -> AppResult<Vec<Sale>> {
    let conn = db.conn.lock()?;
    let query = format!(
        "{} WHERE s.created_at >= ?1 AND s.created_at <= ?2 ORDER BY s.id DESC",
        SALE_SELECT
    );
    let mut stmt = conn.prepare(&query)?;

    let sales = stmt
        .query_map(params![start_date, end_date], row_to_sale)?
        .collect::<Result<Vec<_>, _>>()?;

    load_items_for_sales(&conn, sales)
}

pub fn get_top_products(
    db: &Database,
    start_date: &str,
    end_date: &str,
    limit: i64,
) -> AppResult<Vec<TopProduct>> {
    let conn = db.conn.lock()?;
    let mut stmt = conn.prepare(
        "SELECT si.product_id, si.product_name, \
                SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_rev \
         FROM sale_items si JOIN sales s ON si.sale_id = s.id \
         WHERE s.created_at >= ?1 AND s.created_at <= ?2 AND s.status = ?3 \
         GROUP BY si.product_id, si.product_name \
         ORDER BY total_qty DESC LIMIT ?4",
    )?;

    let products = stmt
        .query_map(params![start_date, end_date, SaleStatus::Completed, limit], |row| {
            Ok(TopProduct {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                total_quantity: row.get(2)?,
                total_revenue: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(products)
}

pub fn cancel_sale(db: &Database, sale_id: i64) -> AppResult<()> {
    let mut conn = db.conn.lock()?;

    // Read items before opening the transaction so the statement borrow does not
    // conflict with the mutable borrow required by conn.transaction().
    let items: Vec<(i64, f64)> = {
        let mut stmt = conn.prepare(
            "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1",
        )?;
        let rows = stmt
            .query_map(params![sale_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        rows
    };

    let tx = conn.transaction()?;

    for (product_id, quantity) in items {
        tx.execute(
            "UPDATE products SET stock = stock + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![quantity, product_id],
        )?;
    }

    tx.execute(
        "UPDATE sales SET status = ?1 WHERE id = ?2",
        params![SaleStatus::Cancelled, sale_id],
    )?;

    tx.commit()?;
    Ok(())
}
