use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::customer::{
    Customer, CustomerAccountMovement, CustomerMovementType, CustomerReportMetrics,
};
use crate::utils::money;
use rusqlite::{params, OptionalExtension};

const CUSTOMER_SELECT: &str = "SELECT c.id, c.name, c.phone, c.notes, c.credit_limit, c.active, \
    COALESCE((SELECT SUM(m.amount) FROM customer_account_movements m WHERE m.customer_id = c.id), 0), \
    c.created_at, c.updated_at FROM customers c";

fn row_to_customer(row: &rusqlite::Row) -> rusqlite::Result<Customer> {
    Ok(Customer {
        id: row.get(0)?,
        name: row.get(1)?,
        phone: row.get(2)?,
        notes: row.get(3)?,
        credit_limit: money::round2(row.get(4)?),
        active: row.get::<_, i64>(5)? != 0,
        balance: money::round2(row.get(6)?),
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn row_to_movement(row: &rusqlite::Row) -> rusqlite::Result<CustomerAccountMovement> {
    Ok(CustomerAccountMovement {
        id: row.get(0)?,
        customer_id: row.get(1)?,
        customer_name: row.get(2)?,
        sale_id: row.get(3)?,
        cash_register_session_id: row.get(4)?,
        user_id: row.get(5)?,
        user_name: row.get(6)?,
        movement_type: row.get(7)?,
        amount: money::round2(row.get(8)?),
        payment_cash_mxn: money::round2(row.get(9)?),
        payment_cash_usd: money::round2(row.get(10)?),
        payment_transfer: money::round2(row.get(11)?),
        exchange_rate: row.get(12)?,
        notes: row.get(13)?,
        created_at: row.get(14)?,
    })
}

pub fn find_all(db: &Database, active_only: bool) -> AppResult<Vec<Customer>> {
    let conn = db.conn.lock()?;
    let query = if active_only {
        format!(
            "{} WHERE c.active = 1 ORDER BY c.name COLLATE NOCASE",
            CUSTOMER_SELECT
        )
    } else {
        format!(
            "{} ORDER BY c.active DESC, c.name COLLATE NOCASE",
            CUSTOMER_SELECT
        )
    };
    let customers = conn
        .prepare(&query)?
        .query_map([], row_to_customer)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(customers)
}

pub fn find_by_id(db: &Database, id: i64) -> AppResult<Option<Customer>> {
    let conn = db.conn.lock()?;
    Ok(conn
        .query_row(
            &format!("{} WHERE c.id = ?1", CUSTOMER_SELECT),
            params![id],
            row_to_customer,
        )
        .optional()?)
}

pub fn create(
    db: &Database,
    name: &str,
    phone: Option<&str>,
    notes: Option<&str>,
    credit_limit: f64,
) -> AppResult<Customer> {
    let conn = db.conn.lock()?;
    conn.execute(
        "INSERT INTO customers (name, phone, notes, credit_limit) VALUES (?1, ?2, ?3, ?4)",
        params![name, phone, notes, money::round2(credit_limit)],
    )?;
    let id = conn.last_insert_rowid();
    drop(conn);
    find_by_id(db, id)?
        .ok_or_else(|| AppError::Database("No se pudo recuperar el cliente creado".to_string()))
}

pub fn update(
    db: &Database,
    id: i64,
    name: Option<&str>,
    phone: Option<&str>,
    notes: Option<&str>,
    credit_limit: Option<f64>,
    active: Option<bool>,
) -> AppResult<Customer> {
    let current = find_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound("Cliente no encontrado".to_string()))?;
    let conn = db.conn.lock()?;
    conn.execute("UPDATE customers SET name = ?1, phone = ?2, notes = ?3, credit_limit = ?4, active = ?5, updated_at = datetime('now', 'localtime') WHERE id = ?6",
        params![name.unwrap_or(&current.name), phone.or(current.phone.as_deref()), notes.or(current.notes.as_deref()), credit_limit.unwrap_or(current.credit_limit), active.unwrap_or(current.active), id])?;
    drop(conn);
    find_by_id(db, id)?.ok_or_else(|| AppError::NotFound("Cliente no encontrado".to_string()))
}

pub fn find_movements(db: &Database, customer_id: i64) -> AppResult<Vec<CustomerAccountMovement>> {
    let conn = db.conn.lock()?;
    let sql = "SELECT m.id, m.customer_id, c.name, m.sale_id, m.cash_register_session_id, m.user_id, u.full_name, m.movement_type, m.amount, m.payment_cash_mxn, m.payment_cash_usd, m.payment_transfer, m.exchange_rate, m.notes, m.created_at FROM customer_account_movements m JOIN customers c ON c.id = m.customer_id JOIN users u ON u.id = m.user_id WHERE m.customer_id = ?1 ORDER BY m.id DESC";
    let movements = conn
        .prepare(sql)?
        .query_map(params![customer_id], row_to_movement)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(movements)
}

pub fn register_payment(
    db: &Database,
    customer_id: i64,
    session_id: i64,
    user_id: i64,
    cash_mxn: f64,
    cash_usd: f64,
    transfer: f64,
    exchange_rate: Option<f64>,
    notes: Option<&str>,
) -> AppResult<CustomerAccountMovement> {
    let mut conn = db.conn.lock()?;
    let tx = conn.transaction()?;
    let active: bool = tx
        .query_row(
            "SELECT active FROM customers WHERE id = ?1",
            params![customer_id],
            |r| r.get::<_, i64>(0).map(|v| v != 0),
        )
        .optional()?
        .ok_or_else(|| AppError::NotFound("Cliente no encontrado".to_string()))?;
    if !active {
        return Err(AppError::Conflict(
            "No se puede registrar un pago para un cliente inactivo".to_string(),
        ));
    }
    let rate = exchange_rate.unwrap_or(1.0);
    let paid = money::total_paid_mxn(cash_mxn, cash_usd, transfer, rate);
    if paid <= 0.0 {
        return Err(AppError::Validation(
            "El pago debe ser mayor que cero".to_string(),
        ));
    }
    let balance: f64 = tx.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM customer_account_movements WHERE customer_id = ?1",
        params![customer_id],
        |r| r.get(0),
    )?;
    if money::round2(paid) > money::round2(balance) {
        return Err(AppError::Validation(
            "El pago no puede exceder el adeudo actual del cliente".to_string(),
        ));
    }
    tx.execute("INSERT INTO customer_account_movements (customer_id, cash_register_session_id, user_id, movement_type, amount, payment_cash_mxn, payment_cash_usd, payment_transfer, exchange_rate, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)", params![customer_id, session_id, user_id, CustomerMovementType::AccountPayment, -money::round2(paid), money::round2(cash_mxn), money::round2(cash_usd), money::round2(transfer), exchange_rate, notes])?;
    let id = tx.last_insert_rowid();
    tx.commit()?;
    drop(conn);
    let conn = db.conn.lock()?;
    conn.query_row("SELECT m.id, m.customer_id, c.name, m.sale_id, m.cash_register_session_id, m.user_id, u.full_name, m.movement_type, m.amount, m.payment_cash_mxn, m.payment_cash_usd, m.payment_transfer, m.exchange_rate, m.notes, m.created_at FROM customer_account_movements m JOIN customers c ON c.id = m.customer_id JOIN users u ON u.id = m.user_id WHERE m.id = ?1", params![id], row_to_movement).map_err(Into::into)
}

pub fn report_metrics(db: &Database, start: &str, end: &str) -> AppResult<CustomerReportMetrics> {
    let conn = db.conn.lock()?;
    let total_credit_sold: f64 = conn.query_row("SELECT COALESCE(SUM(credit_amount), 0) FROM sales WHERE status = 'completed' AND created_at >= ?1 AND created_at <= ?2", params![start, end], |r| r.get(0))?;
    let total_account_collected: f64 = conn.query_row("SELECT COALESCE(-SUM(amount), 0) FROM customer_account_movements WHERE movement_type = ?1 AND created_at >= ?2 AND created_at <= ?3", params![CustomerMovementType::AccountPayment, start, end], |r| r.get(0))?;
    let outstanding_balance: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0) FROM customer_account_movements WHERE created_at <= ?1",
        params![end],
        |r| r.get(0),
    )?;
    let debtors_sql = "SELECT c.id, c.name, c.phone, c.notes, c.credit_limit, c.active, COALESCE(SUM(CASE WHEN m.created_at <= ?1 THEN m.amount ELSE 0 END), 0), c.created_at, c.updated_at FROM customers c LEFT JOIN customer_account_movements m ON m.customer_id = c.id GROUP BY c.id HAVING COALESCE(SUM(CASE WHEN m.created_at <= ?1 THEN m.amount ELSE 0 END), 0) > 0 ORDER BY 7 DESC LIMIT 5";
    let top_debtors = conn
        .prepare(debtors_sql)?
        .query_map(params![end], row_to_customer)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(CustomerReportMetrics {
        total_credit_sold: money::round2(total_credit_sold),
        total_account_collected: money::round2(total_account_collected),
        outstanding_balance: money::round2(outstanding_balance),
        top_debtors,
    })
}
