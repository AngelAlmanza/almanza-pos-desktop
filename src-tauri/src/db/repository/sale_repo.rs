use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::customer::CustomerMovementType;
use crate::models::sale::{Sale, SaleInputMode, SaleItem, SaleStatus, TopProduct};
use crate::utils::money;
use rusqlite::{params, OptionalExtension};

const SALE_SELECT: &str = "\
    SELECT s.id, s.cash_register_session_id, s.user_id, u.full_name, \
            s.total, s.customer_id, c.name, s.credit_amount, s.payment_method, s.payment_amount, \
            s.payment_cash_mxn, s.payment_cash_usd, s.payment_transfer, \
            s.exchange_rate, s.change_amount, s.status, s.created_at \
    FROM sales s JOIN users u ON s.user_id = u.id LEFT JOIN customers c ON s.customer_id = c.id";

pub struct PreparedSaleItem {
    pub product_id: i64,
    pub product_name: String,
    pub quantity: f64,
    pub base_unit: String,
    pub input_mode: SaleInputMode,
    pub input_value: f64,
    pub input_unit: String,
    pub unit_price: f64,
    pub subtotal: f64,
}

fn row_to_sale(row: &rusqlite::Row) -> rusqlite::Result<Sale> {
    Ok(Sale {
        id: row.get(0)?,
        cash_register_session_id: row.get(1)?,
        user_id: row.get(2)?,
        user_name: row.get(3)?,
        total: row.get(4)?,
        customer_id: row.get(5)?,
        customer_name: row.get(6)?,
        credit_amount: money::round2(row.get(7)?),
        payment_method: row.get(8)?,
        payment_amount: row.get(9)?,
        payment_cash_mxn: row.get(10)?,
        payment_cash_usd: row.get(11)?,
        payment_transfer: row.get(12)?,
        exchange_rate: row.get(13)?,
        change_amount: row.get(14)?,
        status: row.get(15)?,
        created_at: row.get(16)?,
        items: Vec::new(),
    })
}

fn find_sale_items_by_sale_id(
    conn: &rusqlite::Connection,
    sale_id: i64,
) -> AppResult<Vec<SaleItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, sale_id, product_id, product_name, quantity, base_unit, input_mode, \
                input_value, input_unit, unit_price, subtotal \
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
                base_unit: row.get(5)?,
                input_mode: row.get(6)?,
                input_value: row.get(7)?,
                input_unit: row.get(8)?,
                unit_price: row.get(9)?,
                subtotal: row.get(10)?,
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
    customer_id: Option<i64>,
    credit_amount: f64,
    items: &[PreparedSaleItem],
) -> AppResult<Sale> {
    let mut conn = db.conn.lock()?;
    let tx = conn.transaction()?;

    if credit_amount > 0.0 {
        let customer_id = customer_id.ok_or_else(|| {
            AppError::Validation("Una venta fiada requiere seleccionar un cliente".to_string())
        })?;
        let customer: Option<(bool, f64)> = tx
            .query_row(
                "SELECT active, credit_limit FROM customers WHERE id = ?1",
                params![customer_id],
                |row| Ok((row.get::<_, i64>(0)? != 0, row.get(1)?)),
            )
            .optional()?;
        let (active, credit_limit) =
            customer.ok_or_else(|| AppError::NotFound("Cliente no encontrado".to_string()))?;
        if !active {
            return Err(AppError::Conflict(
                "El cliente seleccionado está inactivo".to_string(),
            ));
        }
        let balance: f64 = tx.query_row("SELECT COALESCE(SUM(amount), 0) FROM customer_account_movements WHERE customer_id = ?1", params![customer_id], |row| row.get(0))?;
        if money::add_money(balance, credit_amount) > money::round2(credit_limit) {
            return Err(AppError::Validation(format!(
                "La venta excede el límite de crédito del cliente. Disponible: ${:.2}",
                money::sub_money(credit_limit, balance)
            )));
        }
    }

    tx.execute(
        "INSERT INTO sales (cash_register_session_id, user_id, total, customer_id, credit_amount, payment_method, \
            payment_amount, payment_cash_mxn, payment_cash_usd, payment_transfer, \
            exchange_rate, change_amount) \
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            cash_register_session_id,
            user_id,
            total,
            customer_id,
            money::round2(credit_amount),
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

    if credit_amount > 0.0 {
        tx.execute(
            "INSERT INTO customer_account_movements (customer_id, sale_id, cash_register_session_id, user_id, movement_type, amount) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![customer_id, sale_id, cash_register_session_id, user_id, CustomerMovementType::SaleCharge, money::round2(credit_amount)],
        )?;
    }

    for item in items {
        let quantity = money::round3(item.quantity);
        tx.execute(
            "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, base_unit, \
                input_mode, input_value, input_unit, unit_price, subtotal) \
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                sale_id,
                item.product_id,
                item.product_name,
                quantity,
                item.base_unit,
                item.input_mode,
                item.input_value,
                item.input_unit,
                item.unit_price,
                item.subtotal,
            ],
        )?;

        let current_stock: f64 = tx
            .query_row(
                "SELECT stock FROM products WHERE id = ?1",
                params![item.product_id],
                |row| row.get(0),
            )
            .map_err(|_| {
                AppError::NotFound(format!("Producto '{}' no encontrado", item.product_name))
            })?;

        let available_stock = money::round3(current_stock);
        if available_stock < quantity {
            return Err(AppError::Validation(format!(
                "Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}",
                item.product_name, available_stock, quantity
            )));
        }

        let new_stock = money::sub_stock(available_stock, quantity);
        tx.execute(
            "UPDATE products SET stock = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![new_stock, item.product_id],
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

    let (status, credit_amount): (SaleStatus, f64) = tx
        .query_row(
            "SELECT status, credit_amount FROM sales WHERE id = ?1",
            params![sale_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| AppError::NotFound("Venta no encontrada".to_string()))?;

    if status == SaleStatus::Cancelled {
        return Err(AppError::Conflict("La venta ya está cancelada".to_string()));
    }
    if money::round2(credit_amount) > 0.0 {
        return Err(AppError::Conflict(
            "Las ventas fiadas no se pueden cancelar".to_string(),
        ));
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
    use super::{cancel_sale, create, PreparedSaleItem};
    use crate::db::Database;
    use crate::models::sale::SaleInputMode;
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
                customer_id INTEGER,
                credit_amount REAL NOT NULL DEFAULT 0,
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
                base_unit TEXT,
                input_mode TEXT,
                input_value REAL,
                input_unit TEXT,
                unit_price REAL NOT NULL,
                subtotal REAL NOT NULL
            );
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                credit_limit REAL NOT NULL DEFAULT 0,
                phone TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00',
                updated_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00'
            );
            CREATE TABLE customer_account_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                sale_id INTEGER,
                cash_register_session_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL,
                amount REAL NOT NULL,
                payment_cash_mxn REAL NOT NULL DEFAULT 0,
                payment_cash_usd REAL NOT NULL DEFAULT 0,
                payment_transfer REAL NOT NULL DEFAULT 0,
                exchange_rate REAL,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00'
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
            None,
            0.0,
            &[PreparedSaleItem {
                product_id: 1,
                product_name: "Producto a granel".to_string(),
                quantity: 0.333,
                base_unit: "kg".to_string(),
                input_mode: SaleInputMode::Sub,
                input_value: 333.0,
                input_unit: "g".to_string(),
                unit_price: 100.0,
                subtotal: 33.30,
            }],
        )
        .unwrap();

        assert_eq!(sale.items[0].quantity, 0.333);
        assert_eq!(sale.items[0].base_unit.as_deref(), Some("kg"));
        assert_eq!(sale.items[0].input_mode, Some(SaleInputMode::Sub));
        assert_eq!(sale.items[0].input_value, Some(333.0));
        assert_eq!(sale.items[0].input_unit.as_deref(), Some("g"));
        assert_eq!(product_stock(&db), 0.667);

        cancel_sale(&db, sale.id).unwrap();
        assert_eq!(product_stock(&db), 1.0);

        assert!(cancel_sale(&db, sale.id).is_err());
        assert_eq!(product_stock(&db), 1.0);
    }

    #[test]
    fn credit_sale_creates_a_charge_and_cannot_be_cancelled() {
        let db = test_database(5.0);
        db.conn
            .lock()
            .unwrap()
            .execute(
                "INSERT INTO customers (id, name, active, credit_limit) VALUES (2, 'Cliente fiado', 1, 100)",
                [],
            )
            .unwrap();

        let sale = create(
            &db,
            1,
            1,
            20.0,
            "cash_mxn",
            0.0,
            0.0,
            0.0,
            0.0,
            None,
            0.0,
            Some(2),
            20.0,
            &[PreparedSaleItem {
                product_id: 1,
                product_name: "Producto".to_string(),
                quantity: 1.0,
                base_unit: "pieza".to_string(),
                input_mode: SaleInputMode::Base,
                input_value: 1.0,
                input_unit: "pieza".to_string(),
                unit_price: 20.0,
                subtotal: 20.0,
            }],
        )
        .unwrap();

        assert_eq!(sale.credit_amount, 20.0);
        let balance: f64 = db
            .conn
            .lock()
            .unwrap()
            .query_row(
                "SELECT SUM(amount) FROM customer_account_movements WHERE customer_id = 2",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(balance, 20.0);
        assert!(cancel_sale(&db, sale.id).is_err());
        assert_eq!(product_stock(&db), 4.0);
    }
}
