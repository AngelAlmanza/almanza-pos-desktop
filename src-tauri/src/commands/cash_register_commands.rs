use crate::db::repository::cash_register_repo;
use crate::db::Database;
use crate::models::cash_register::{
    CashRegisterSession, CashRegisterSummary, CloseCashRegisterRequest, DateRangeRequest,
    OpenCashRegisterRequest,
};
use tauri::State;

#[tauri::command]
pub fn get_cash_register_sessions(db: State<Database>) -> Result<Vec<CashRegisterSession>, String> {
    cash_register_repo::find_all(&db)
}

#[tauri::command]
pub fn get_cash_register_sessions_by_date_range(
    db: State<Database>,
    request: DateRangeRequest,
) -> Result<Vec<CashRegisterSession>, String> {
    cash_register_repo::find_by_date_range(&db, &request.start_date, &request.end_date)
}

#[tauri::command]
pub fn get_cash_register_session(
    db: State<Database>,
    id: i64,
) -> Result<CashRegisterSession, String> {
    cash_register_repo::find_by_id(&db, id)?
        .ok_or_else(|| "Sesión de caja no encontrada".to_string())
}

#[tauri::command]
pub fn get_open_cash_register(db: State<Database>) -> Result<Option<CashRegisterSession>, String> {
    cash_register_repo::find_any_open(&db)
}

#[tauri::command]
pub fn get_open_cash_register_by_user(
    db: State<Database>,
    user_id: i64,
) -> Result<Option<CashRegisterSession>, String> {
    cash_register_repo::find_open_by_user(&db, user_id)
}

#[tauri::command]
pub fn open_cash_register(
    db: State<Database>,
    request: OpenCashRegisterRequest,
) -> Result<CashRegisterSession, String> {
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
) -> Result<CashRegisterSummary, String> {
    cash_register_repo::close_session(&db, request.session_id, request.closing_amount)
}

#[tauri::command]
pub fn get_cash_register_summary(
    db: State<Database>,
    session_id: i64,
) -> Result<CashRegisterSummary, String> {
    cash_register_repo::get_summary(&db, session_id)
}
