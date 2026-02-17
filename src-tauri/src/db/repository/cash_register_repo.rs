use crate::db::Database;
use crate::models::cash_register::{CashRegisterSession, CashRegisterSummary};
use rusqlite::params;

fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<CashRegisterSession> {
    Ok(CashRegisterSession {
        id: row.get(0)?,
        user_id: row.get(1)?,
        user_name: row.get(2)?,
        opening_amount: row.get(3)?,
        closing_amount: row.get(4)?,
        exchange_rate: row.get(5)?,
        status: row.get(6)?,
        opened_at: row.get(7)?,
        closed_at: row.get(8)?,
        total_sales: None,
        total_transactions: None,
    })
}

const SELECT_QUERY: &str = "SELECT cr.id, cr.user_id, u.full_name, cr.opening_amount, cr.closing_amount, cr.exchange_rate, cr.status, cr.opened_at, cr.closed_at FROM cash_register_sessions cr JOIN users u ON cr.user_id = u.id";

pub fn find_all(db: &Database) -> Result<Vec<CashRegisterSession>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!("{} ORDER BY cr.id DESC", SELECT_QUERY);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map([], row_to_session)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}

pub fn find_by_id(db: &Database, id: i64) -> Result<Option<CashRegisterSession>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!("{} WHERE cr.id = ?1", SELECT_QUERY);
    let result = conn.query_row(&query, params![id], row_to_session).ok();
    Ok(result)
}

pub fn find_open_by_user(db: &Database, user_id: i64) -> Result<Option<CashRegisterSession>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!("{} WHERE cr.user_id = ?1 AND cr.status = 'open'", SELECT_QUERY);
    let result = conn.query_row(&query, params![user_id], row_to_session).ok();
    Ok(result)
}

pub fn find_by_date_range(db: &Database, start_date: &str, end_date: &str) -> Result<Vec<CashRegisterSession>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!(
        "{} WHERE cr.opened_at >= ?1 AND ((cr.status = 'closed' AND cr.closed_at <= ?2) OR (cr.status = 'open' AND cr.opened_at <= ?2)) ORDER BY cr.id DESC",
        SELECT_QUERY
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map(params![start_date, end_date], row_to_session)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}

pub fn find_any_open(db: &Database) -> Result<Option<CashRegisterSession>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let query = format!("{} WHERE cr.status = 'open' LIMIT 1", SELECT_QUERY);
    let result = conn.query_row(&query, [], row_to_session).ok();
    Ok(result)
}

pub fn open_session(
    db: &Database,
    user_id: i64,
    opening_amount: f64,
    exchange_rate: Option<f64>,
) -> Result<CashRegisterSession, String> {
    // Check if there's already an open session
    let existing = find_any_open(db)?;
    if existing.is_some() {
        return Err("Ya hay una caja abierta. Debe cerrarse antes de abrir otra.".to_string());
    }

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO cash_register_sessions (user_id, opening_amount, exchange_rate, status) VALUES (?1, ?2, ?3, 'open')",
        params![user_id, opening_amount, exchange_rate],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    drop(conn);
    find_by_id(db, id)?.ok_or_else(|| "Failed to retrieve created session".to_string())
}

pub fn close_session(db: &Database, session_id: i64, closing_amount: f64) -> Result<CashRegisterSummary, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE cash_register_sessions SET status = 'closed', closing_amount = ?1, closed_at = datetime('now', 'localtime') WHERE id = ?2 AND status = 'open'",
        params![closing_amount, session_id],
    )
    .map_err(|e| e.to_string())?;

    if conn.changes() == 0 {
        return Err("Sesión no encontrada o ya está cerrada".to_string());
    }

    // Calculate summary
    let total_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total), 0) FROM sales WHERE cash_register_session_id = ?1 AND status = 'completed'",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_transactions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sales WHERE cash_register_session_id = ?1 AND status = 'completed'",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    drop(conn);

    let session = find_by_id(db, session_id)?.ok_or_else(|| "Session not found".to_string())?;
    let expected_cash = session.opening_amount + total_sales;
    let difference = closing_amount - expected_cash;

    Ok(CashRegisterSummary {
        session,
        total_sales,
        total_transactions,
        total_cash: closing_amount,
        expected_cash,
        difference,
    })
}

pub fn get_summary(db: &Database, session_id: i64) -> Result<CashRegisterSummary, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let total_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total), 0) FROM sales WHERE cash_register_session_id = ?1 AND status = 'completed'",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_transactions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sales WHERE cash_register_session_id = ?1 AND status = 'completed'",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    drop(conn);

    let session = find_by_id(db, session_id)?.ok_or_else(|| "Session not found".to_string())?;
    let closing = session.closing_amount.unwrap_or(0.0);
    let expected_cash = session.opening_amount + total_sales;
    let difference = closing - expected_cash;

    Ok(CashRegisterSummary {
        session,
        total_sales,
        total_transactions,
        total_cash: closing,
        expected_cash,
        difference,
    })
}
