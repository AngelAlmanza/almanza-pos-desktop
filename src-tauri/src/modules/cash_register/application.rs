use crate::constants::{DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE};
use crate::models::cash_register::{
    CashRegisterSession, CashRegisterSummary, CloseCashRegisterRequest, DateRangeRequest,
    OpenCashRegisterRequest,
};
use crate::shared::error::{AppError, AppResult};
use crate::shared::pagination::PaginatedResult;

pub trait CashRegisterRepository {
    fn find_all(&self) -> AppResult<Vec<CashRegisterSession>>;
    fn find_by_id(&self, id: i64) -> AppResult<Option<CashRegisterSession>>;
    fn find_open_by_user(&self, user_id: i64) -> AppResult<Option<CashRegisterSession>>;
    fn find_any_open(&self) -> AppResult<Option<CashRegisterSession>>;
    fn find_by_date_range_paginated(
        &self,
        start_date: &str,
        end_date: &str,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<CashRegisterSession>, i64)>;
    fn open_session(
        &self,
        user_id: i64,
        opening_amount: f64,
        exchange_rate: Option<f64>,
    ) -> AppResult<CashRegisterSession>;
    fn close_session(
        &self,
        session_id: i64,
        closing_cash_mxn: f64,
        closing_cash_usd: f64,
    ) -> AppResult<CashRegisterSummary>;
    fn get_summary(&self, session_id: i64) -> AppResult<CashRegisterSummary>;
}

pub trait CashRegisterSessionLookup {
    fn find_by_id(&self, id: i64) -> AppResult<Option<CashRegisterSession>>;
}

pub fn get_sessions(
    repository: &impl CashRegisterRepository,
) -> AppResult<Vec<CashRegisterSession>> {
    repository.find_all()
}

pub fn get_sessions_by_date_range(
    repository: &impl CashRegisterRepository,
    request: DateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<CashRegisterSession>> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);
    let (data, total) = repository.find_by_date_range_paginated(
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

pub fn get_session(
    repository: &impl CashRegisterRepository,
    id: i64,
) -> AppResult<CashRegisterSession> {
    repository
        .find_by_id(id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))
}

pub fn get_open(
    repository: &impl CashRegisterRepository,
) -> AppResult<Option<CashRegisterSession>> {
    repository.find_any_open()
}

pub fn get_open_by_user(
    repository: &impl CashRegisterRepository,
    user_id: i64,
) -> AppResult<Option<CashRegisterSession>> {
    repository.find_open_by_user(user_id)
}

pub fn open_session(
    repository: &impl CashRegisterRepository,
    request: OpenCashRegisterRequest,
) -> AppResult<CashRegisterSession> {
    if request.opening_amount < 0.0 {
        return Err(AppError::Validation(
            "El monto de apertura no puede ser negativo".to_string(),
        ));
    }
    if request.exchange_rate.is_some_and(|rate| rate <= 0.0) {
        return Err(AppError::Validation(
            "El tipo de cambio debe ser mayor a cero".to_string(),
        ));
    }
    repository.open_session(
        request.user_id,
        request.opening_amount,
        request.exchange_rate,
    )
}

pub fn close_session(
    repository: &impl CashRegisterRepository,
    request: CloseCashRegisterRequest,
) -> AppResult<CashRegisterSummary> {
    repository.close_session(
        request.session_id,
        request.closing_cash_mxn,
        request.closing_cash_usd,
    )
}

pub fn get_summary(
    repository: &impl CashRegisterRepository,
    session_id: i64,
) -> AppResult<CashRegisterSummary> {
    repository.get_summary(session_id)
}
