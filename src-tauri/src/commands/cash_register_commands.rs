use crate::constants::{DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE};
use crate::db::repository::cash_register_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::cash_register::{
    CashRegisterSession, CashRegisterSummary, CloseCashRegisterRequest, DateRangeRequest,
    OpenCashRegisterRequest,
};
use crate::models::shared::PaginatedResult;
use tauri::State;

#[tauri::command]
pub fn get_cash_register_sessions(db: State<Database>) -> AppResult<Vec<CashRegisterSession>> {
    cash_register_repo::find_all(&db)
}

#[tauri::command]
pub fn get_cash_register_sessions_by_date_range(
    db: State<Database>,
    request: DateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<CashRegisterSession>> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE);
    let (data, total) = cash_register_repo::find_by_date_range_paginated(
        &db,
        &request.start_date,
        &request.end_date,
        page,
        page_size,
    )?;
    Ok(PaginatedResult {
        data,
        total,
        page,
        page_size,
    })
}

#[tauri::command]
pub fn get_cash_register_session(
    db: State<Database>,
    id: i64,
) -> AppResult<CashRegisterSession> {
    cash_register_repo::find_by_id(&db, id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))
}

#[tauri::command]
pub fn get_open_cash_register(db: State<Database>) -> AppResult<Option<CashRegisterSession>> {
    cash_register_repo::find_any_open(&db)
}

#[tauri::command]
pub fn get_open_cash_register_by_user(
    db: State<Database>,
    user_id: i64,
) -> AppResult<Option<CashRegisterSession>> {
    cash_register_repo::find_open_by_user(&db, user_id)
}

#[tauri::command]
pub fn open_cash_register(
    db: State<Database>,
    request: OpenCashRegisterRequest,
) -> AppResult<CashRegisterSession> {
    if request.opening_amount < 0.0 {
        return Err(AppError::Validation(
            "El monto de apertura no puede ser negativo".to_string(),
        ));
    }
    if let Some(rate) = request.exchange_rate {
        if rate <= 0.0 {
            return Err(AppError::Validation(
                "El tipo de cambio debe ser mayor a cero".to_string(),
            ));
        }
    }

    cash_register_repo::open_session(
        &db,
        request.user_id,
        request.opening_amount,
        request.exchange_rate,
    )
}

#[tauri::command]
pub fn close_cash_register(
    db: State<Database>,
    request: CloseCashRegisterRequest,
) -> AppResult<CashRegisterSummary> {
    cash_register_repo::close_session(
        &db,
        request.session_id,
        request.closing_cash_mxn,
        request.closing_cash_usd,
    )
}

#[tauri::command]
pub fn get_cash_register_summary(
    db: State<Database>,
    session_id: i64,
) -> AppResult<CashRegisterSummary> {
    cash_register_repo::get_summary(&db, session_id)
}
