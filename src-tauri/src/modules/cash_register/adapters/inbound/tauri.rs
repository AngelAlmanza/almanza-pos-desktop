use crate::infrastructure::sqlite::Database;
use crate::models::cash_register::{
    CashRegisterSession, CashRegisterSummary, CloseCashRegisterRequest, DateRangeRequest,
    OpenCashRegisterRequest,
};
use crate::modules::cash_register::{
    adapters::outbound::sqlite::SqliteCashRegisterRepository, application,
};
use crate::shared::error::AppResult;
use crate::shared::pagination::PaginatedResult;
use tauri::State;

#[tauri::command]
pub fn get_cash_register_sessions(db: State<Database>) -> AppResult<Vec<CashRegisterSession>> {
    application::get_sessions(&SqliteCashRegisterRepository::new(&db))
}
#[tauri::command]
pub fn get_cash_register_sessions_by_date_range(
    db: State<Database>,
    request: DateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<CashRegisterSession>> {
    application::get_sessions_by_date_range(
        &SqliteCashRegisterRepository::new(&db),
        request,
        page,
        page_size,
    )
}
#[tauri::command]
pub fn get_cash_register_session(db: State<Database>, id: i64) -> AppResult<CashRegisterSession> {
    application::get_session(&SqliteCashRegisterRepository::new(&db), id)
}
#[tauri::command]
pub fn get_open_cash_register(db: State<Database>) -> AppResult<Option<CashRegisterSession>> {
    application::get_open(&SqliteCashRegisterRepository::new(&db))
}
#[tauri::command]
pub fn get_open_cash_register_by_user(
    db: State<Database>,
    user_id: i64,
) -> AppResult<Option<CashRegisterSession>> {
    application::get_open_by_user(&SqliteCashRegisterRepository::new(&db), user_id)
}
#[tauri::command]
pub fn open_cash_register(
    db: State<Database>,
    request: OpenCashRegisterRequest,
) -> AppResult<CashRegisterSession> {
    application::open_session(&SqliteCashRegisterRepository::new(&db), request)
}
#[tauri::command]
pub fn close_cash_register(
    db: State<Database>,
    request: CloseCashRegisterRequest,
) -> AppResult<CashRegisterSummary> {
    application::close_session(&SqliteCashRegisterRepository::new(&db), request)
}
#[tauri::command]
pub fn get_cash_register_summary(
    db: State<Database>,
    session_id: i64,
) -> AppResult<CashRegisterSummary> {
    application::get_summary(&SqliteCashRegisterRepository::new(&db), session_id)
}
