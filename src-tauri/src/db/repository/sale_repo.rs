use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::sale::{Sale, SaleItem, SaleStatus, TopProduct};
use crate::utils::money;
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
            cash_register_session_id,
            user_id,
            total,
            payment_method,
            payment_amount,
            payment_cash_mxn,
            payment_cash_usd,
            payment_transfer,
            exchange_rate,
            change_amount
        ],
    )?;

    let sale_id = tx.last_insert_rowid();

    for item in items {
        let quantity = money::round3(item.2);
        tx.execute(
            "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) \
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![sale_id, item.0, item.1, quantity, item.3, item.4],
        )?;

        let current_stock: f64 = tx
            .query_row(
                "SELECT stock FROM products WHERE id = ?1",
                params![item.0],
                |row| row.get(0),
            )
            .map_err(|_| AppError::NotFound(format!("Producto '{}' no encontrado", item.1)))?;

        let available_stock = money::round3(current_stock);
        if available_stock < quantity {
            return Err(AppError::Validation(format!(
                "Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}",
                item.1, available_stock, quantity
            )));
        }

        let new_stock = money::sub_stock(available_stock, quantity);
        tx.execute(
            "UPDATE products SET stock = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![new_stock, item.0],
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
        .query_map(
            params![start_date, end_date, page_size, offset],
            row_to_sale,
        )?
        .collect::<Result<Vec<_>, _>>()?;

    let sales = load_items_for_sales(&conn, sales)?;
    Ok((sales, total))
}

pub fn find_by_date_range(db: &Database, start_date: &str, end_date: &str) -> AppResult<Vec<Sale>> {
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
        .query_map(
            params![start_date, end_date, SaleStatus::Completed, limit],
            |row| {
                Ok(TopProduct {
                    product_id: row.get(0)?,
                    product_name: row.get(1)?,
                    total_quantity: money::round3(row.get::<_, f64>(2)?),
                    total_revenue: money::round2(row.get::<_, f64>(3)?),
                })
            },
        )?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(products)
}

pub fn cancel_sale(db: &Database, sale_id: i64) -> AppResult<()> {
    let mut conn = db.conn.lock()?;
    let tx = conn.transaction()?;

    let status: SaleStatus = tx
        .query_row(
            "SELECT status FROM sales WHERE id = ?1",
            params![sale_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound("Venta no encontrada".to_string()))?;

    if status == SaleStatus::Cancelled {
        return Err(AppError::Conflict("La venta ya está cancelada".to_string()));
    }

    let items: Vec<(i64, f64)> = {
        let mut stmt =
            tx.prepare("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?1")?;
        let rows = stmt
            .query_map(params![sale_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        rows
    };

    for (product_id, quantity) in items {
        let current_stock: f64 = tx
            .query_row(
                "SELECT stock FROM products WHERE id = ?1",
                params![product_id],
                |row| row.get(0),
            )
            .map_err(|_| {
                AppError::NotFound(format!("Producto con ID {} no encontrado", product_id))
            })?;

        let new_stock = money::add_stock(money::round3(current_stock), money::round3(quantity));
        tx.execute(
            "UPDATE products SET stock = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![new_stock, product_id],
        )?;
    }

    tx.execute(
        "UPDATE sales SET status = ?1 WHERE id = ?2",
        params![SaleStatus::Cancelled, sale_id],
    )?;

    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{cancel_sale, create};
    use crate::db::Database;
    use rusqlite::Connection;
    use std::sync::Mutex;

    fn test_database(stock: f64) -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                full_name TEXT NOT NULL
            );
            CREATE TABLE products (
                id INTEGER PRIMARY KEY,
                stock REAL NOT NULL,
                updated_at TEXT
            );
            CREATE TABLE sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cash_register_session_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                total REAL NOT NULL,
                payment_method TEXT NOT NULL,
                payment_amount REAL NOT NULL,
                payment_cash_mxn REAL NOT NULL,
                payment_cash_usd REAL NOT NULL,
                payment_transfer REAL NOT NULL,
                exchange_rate REAL,
                change_amount REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'completed',
                created_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00'
            );
            CREATE TABLE sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                subtotal REAL NOT NULL
            );
            INSERT INTO users (id, full_name) VALUES (1, 'Test User');",
        )
        .unwrap();
        conn.execute("INSERT INTO products (id, stock) VALUES (1, ?1)", [stock])
            .unwrap();

        Database {
            conn: Mutex::new(conn),
        }
    }

    fn product_stock(db: &Database) -> f64 {
        db.conn
            .lock()
            .unwrap()
            .query_row("SELECT stock FROM products WHERE id = 1", [], |row| {
                row.get(0)
            })
            .unwrap()
    }

    #[test]
    fn bulk_sale_and_cancellation_keep_stock_rounded_without_double_return() {
        let db = test_database(1.0);
        let sale = create(
            &db,
            1,
            1,
            33.30,
            "cash_mxn",
            33.30,
            33.30,
            0.0,
            0.0,
            None,
            0.0,
            &[(1, "Producto a granel".to_string(), 0.333, 100.0, 33.30)],
        )
        .unwrap();

        assert_eq!(sale.items[0].quantity, 0.333);
        assert_eq!(product_stock(&db), 0.667);

        cancel_sale(&db, sale.id).unwrap();
        assert_eq!(product_stock(&db), 1.0);

        assert!(cancel_sale(&db, sale.id).is_err());
        assert_eq!(product_stock(&db), 1.0);
    }
}
