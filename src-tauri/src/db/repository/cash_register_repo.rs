use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::cash_register::{CashRegisterSession, CashRegisterSummary, SessionStatus};
use crate::models::sale::SaleStatus;
use crate::utils::money;
use rusqlite::params;

const SELECT_QUERY: &str = "\
    SELECT cr.id, cr.user_id, u.full_name, cr.opening_amount, cr.closing_amount, \
           cr.closing_cash_mxn, cr.closing_cash_usd, cr.exchange_rate, \
           cr.status, cr.opened_at, cr.closed_at \
    FROM cash_register_sessions cr JOIN users u ON cr.user_id = u.id";

fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<CashRegisterSession> {
    Ok(CashRegisterSession {
        id: row.get(0)?,
        user_id: row.get(1)?,
        user_name: row.get(2)?,
        opening_amount: row.get(3)?,
        closing_amount: row.get(4)?,
        closing_cash_mxn: row.get(5)?,
        closing_cash_usd: row.get(6)?,
        exchange_rate: row.get(7)?,
        status: row.get(8)?,   // FromSql convierte TEXT → SessionStatus automáticamente
        opened_at: row.get(9)?,
        closed_at: row.get(10)?,
        total_sales: None,
        total_transactions: None,
    })
}

pub fn find_all(db: &Database) -> AppResult<Vec<CashRegisterSession>> {
    let conn = db.conn.lock()?;
    let query = format!("{} ORDER BY cr.id DESC", SELECT_QUERY);
    let mut stmt = conn.prepare(&query)?;

    let sessions = stmt
        .query_map([], row_to_session)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(sessions)
}

pub fn find_by_id(db: &Database, id: i64) -> AppResult<Option<CashRegisterSession>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE cr.id = ?1", SELECT_QUERY);
    let result = conn.query_row(&query, params![id], row_to_session).ok();
    Ok(result)
}

pub fn find_open_by_user(db: &Database, user_id: i64) -> AppResult<Option<CashRegisterSession>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE cr.user_id = ?1 AND cr.status = ?2", SELECT_QUERY);
    let result = conn
        .query_row(&query, params![user_id, SessionStatus::Open], row_to_session)
        .ok();
    Ok(result)
}

pub fn find_by_date_range_paginated(
    db: &Database,
    start_date: &str,
    end_date: &str,
    page: i64,
    page_size: i64,
) -> AppResult<(Vec<CashRegisterSession>, i64)> {
    let conn = db.conn.lock()?;

    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cash_register_sessions cr \
         WHERE cr.opened_at >= ?1 \
           AND ((cr.status = ?3 AND cr.closed_at <= ?2) \
             OR (cr.status = ?4 AND cr.opened_at  <= ?2))",
        params![start_date, end_date, SessionStatus::Closed, SessionStatus::Open],
        |row| row.get(0),
    )?;

    let offset = (page - 1) * page_size;
    let query = format!(
        "{} WHERE cr.opened_at >= ?1 \
           AND ((cr.status = ?3 AND cr.closed_at <= ?2) \
             OR (cr.status = ?4 AND cr.opened_at  <= ?2)) \
         ORDER BY cr.id DESC LIMIT ?5 OFFSET ?6",
        SELECT_QUERY
    );
    let mut stmt = conn.prepare(&query)?;

    let sessions = stmt
        .query_map(
            params![start_date, end_date, SessionStatus::Closed, SessionStatus::Open, page_size, offset],
            row_to_session,
        )?
        .collect::<Result<Vec<_>, _>>()?;

    Ok((sessions, total))
}

pub fn find_any_open(db: &Database) -> AppResult<Option<CashRegisterSession>> {
    let conn = db.conn.lock()?;
    let query = format!("{} WHERE cr.status = ?1 LIMIT 1", SELECT_QUERY);
    let result = conn
        .query_row(&query, params![SessionStatus::Open], row_to_session)
        .ok();
    Ok(result)
}

pub fn open_session(
    db: &Database,
    user_id: i64,
    opening_amount: f64,
    exchange_rate: Option<f64>,
) -> AppResult<CashRegisterSession> {
    if find_any_open(db)?.is_some() {
        return Err(AppError::Conflict(
            "Ya hay una caja abierta. Debe cerrarse antes de abrir otra.".to_string(),
        ));
    }

    let conn = db.conn.lock()?;
    conn.execute(
        "INSERT INTO cash_register_sessions (user_id, opening_amount, exchange_rate, status) \
         VALUES (?1, ?2, ?3, ?4)",
        params![
            user_id,
            money::round2(opening_amount),
            exchange_rate.map(money::round2),
            SessionStatus::Open,
        ],
    )?;

    let id = conn.last_insert_rowid();
    drop(conn);
    find_by_id(db, id)?
        .ok_or_else(|| AppError::NotFound("Failed to retrieve created session".to_string()))
}

struct SessionSalesBreakdown {
    total_sales: f64,
    total_transactions: i64,
    sales_cash_mxn: f64,
    sales_cash_usd: f64,
    sales_transfer: f64,
    total_change_given: f64,
}

fn query_sales_breakdown(
    conn: &rusqlite::Connection,
    session_id: i64,
) -> AppResult<SessionSalesBreakdown> {
    let row = conn.query_row(
        "SELECT \
            COALESCE(SUM(total), 0), \
            COUNT(*), \
            COALESCE(SUM(payment_cash_mxn), 0), \
            COALESCE(SUM(payment_cash_usd), 0), \
            COALESCE(SUM(payment_transfer), 0), \
            COALESCE(SUM(change_amount), 0) \
         FROM sales \
         WHERE cash_register_session_id = ?1 AND status = ?2",
        params![session_id, SaleStatus::Completed],
        |row| {
            Ok(SessionSalesBreakdown {
                total_sales: row.get(0)?,
                total_transactions: row.get(1)?,
                sales_cash_mxn: row.get(2)?,
                sales_cash_usd: row.get(3)?,
                sales_transfer: row.get(4)?,
                total_change_given: row.get(5)?,
            })
        },
    )?;

    Ok(SessionSalesBreakdown {
        total_sales: money::round2(row.total_sales),
        total_transactions: row.total_transactions,
        sales_cash_mxn: money::round2(row.sales_cash_mxn),
        sales_cash_usd: money::round2(row.sales_cash_usd),
        sales_transfer: money::round2(row.sales_transfer),
        total_change_given: money::round2(row.total_change_given),
    })
}

fn build_summary(
    session: CashRegisterSession,
    breakdown: SessionSalesBreakdown,
) -> CashRegisterSummary {
    let actual_mxn = session.closing_cash_mxn.unwrap_or(0.0);
    let actual_usd = session.closing_cash_usd.unwrap_or(0.0);

    let expected_mxn = money::round2(
        session.opening_amount + breakdown.sales_cash_mxn - breakdown.total_change_given,
    );
    let expected_usd = breakdown.sales_cash_usd;

    CashRegisterSummary {
        session,
        total_sales: breakdown.total_sales,
        total_transactions: breakdown.total_transactions,
        sales_cash_mxn: breakdown.sales_cash_mxn,
        sales_cash_usd: breakdown.sales_cash_usd,
        sales_transfer: breakdown.sales_transfer,
        total_change_given: breakdown.total_change_given,
        expected_cash_mxn: expected_mxn,
        expected_cash_usd: expected_usd,
        actual_cash_mxn: actual_mxn,
        actual_cash_usd: actual_usd,
        difference_mxn: money::round2(actual_mxn - expected_mxn),
        difference_usd: money::round2(actual_usd - expected_usd),
    }
}

pub fn close_session(
    db: &Database,
    session_id: i64,
    closing_cash_mxn: f64,
    closing_cash_usd: f64,
) -> AppResult<CashRegisterSummary> {
    let conn = db.conn.lock()?;

    let closing_total = money::round2(closing_cash_mxn + closing_cash_usd);
    conn.execute(
        "UPDATE cash_register_sessions \
         SET status = ?1, \
             closing_amount = ?2, \
             closing_cash_mxn = ?3, \
             closing_cash_usd = ?4, \
             closed_at = datetime('now', 'localtime') \
         WHERE id = ?5 AND status = ?6",
        params![
            SessionStatus::Closed,
            closing_total,
            money::round2(closing_cash_mxn),
            money::round2(closing_cash_usd),
            session_id,
            SessionStatus::Open,
        ],
    )?;

    if conn.changes() == 0 {
        return Err(AppError::NotFound(
            "Sesión no encontrada o ya está cerrada".to_string(),
        ));
    }

    let breakdown = query_sales_breakdown(&conn, session_id)?;
    drop(conn);

    let session = find_by_id(db, session_id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))?;

    Ok(build_summary(session, breakdown))
}

pub fn get_summary(db: &Database, session_id: i64) -> AppResult<CashRegisterSummary> {
    let conn = db.conn.lock()?;
    let breakdown = query_sales_breakdown(&conn, session_id)?;
    drop(conn);

    let session = find_by_id(db, session_id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))?;

    Ok(build_summary(session, breakdown))
}
