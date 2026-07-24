use crate::db::repository::{cash_register_repo, customer_repo, setting_repo};
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::cash_register::SessionStatus;
use crate::models::customer::{
    CreateCustomerPaymentRequest, CreateCustomerRequest, Customer, CustomerAccountMovement,
    UpdateCustomerRequest,
};
use crate::utils::money;
use tauri::State;

fn validate_limit(limit: f64) -> AppResult<f64> {
    if !limit.is_finite() || limit < 0.0 {
        Err(AppError::Validation(
            "El límite de crédito debe ser un monto válido mayor o igual a cero".to_string(),
        ))
    } else {
        Ok(money::round2(limit))
    }
}

#[tauri::command]
pub fn get_customers(db: State<Database>) -> AppResult<Vec<Customer>> {
    customer_repo::find_all(&db, false)
}
#[tauri::command]
pub fn get_active_customers(db: State<Database>) -> AppResult<Vec<Customer>> {
    customer_repo::find_all(&db, true)
}
#[tauri::command]
pub fn get_customer(db: State<Database>, id: i64) -> AppResult<Customer> {
    customer_repo::find_by_id(&db, id)?
        .ok_or_else(|| AppError::NotFound("Cliente no encontrado".to_string()))
}

#[tauri::command]
pub fn create_customer(db: State<Database>, request: CreateCustomerRequest) -> AppResult<Customer> {
    let name = request.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "El nombre del cliente es obligatorio".to_string(),
        ));
    }
    let default_limit = setting_repo::find_by_key(&db, "default_customer_credit_limit")?
        .and_then(|s| s.value)
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(0.0);
    let limit = validate_limit(request.credit_limit.unwrap_or(default_limit))?;
    customer_repo::create(
        &db,
        name,
        request.phone.as_deref().filter(|s| !s.trim().is_empty()),
        request.notes.as_deref().filter(|s| !s.trim().is_empty()),
        limit,
    )
}

#[tauri::command]
pub fn update_customer(db: State<Database>, request: UpdateCustomerRequest) -> AppResult<Customer> {
    if let Some(ref name) = request.name {
        if name.trim().is_empty() {
            return Err(AppError::Validation(
                "El nombre del cliente es obligatorio".to_string(),
            ));
        }
    }
    let limit = request.credit_limit.map(validate_limit).transpose()?;
    customer_repo::update(
        &db,
        request.id,
        request.name.as_deref().map(str::trim),
        request.phone.as_deref(),
        request.notes.as_deref(),
        limit,
        request.active,
    )
}

#[tauri::command]
pub fn get_customer_movements(
    db: State<Database>,
    customer_id: i64,
) -> AppResult<Vec<CustomerAccountMovement>> {
    let _ = get_customer(db.clone(), customer_id)?;
    customer_repo::find_movements(&db, customer_id)
}

#[tauri::command]
pub fn register_customer_payment(
    db: State<Database>,
    request: CreateCustomerPaymentRequest,
) -> AppResult<CustomerAccountMovement> {
    let session = cash_register_repo::find_by_id(&db, request.cash_register_session_id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))?;
    if session.status != SessionStatus::Open {
        return Err(AppError::Conflict(
            "La sesión de caja no está abierta".to_string(),
        ));
    }
    if request.payment_cash_mxn < 0.0
        || request.payment_cash_usd < 0.0
        || request.payment_transfer < 0.0
    {
        return Err(AppError::Validation(
            "Los montos de pago no pueden ser negativos".to_string(),
        ));
    }
    if request.payment_cash_usd > 0.0 && session.exchange_rate.is_none() {
        return Err(AppError::Validation(
            "No se puede recibir USD sin tipo de cambio configurado en la caja".to_string(),
        ));
    }
    customer_repo::register_payment(
        &db,
        request.customer_id,
        request.cash_register_session_id,
        request.user_id,
        money::round2(request.payment_cash_mxn),
        money::round2(request.payment_cash_usd),
        money::round2(request.payment_transfer),
        session.exchange_rate,
        request.notes.as_deref().filter(|s| !s.trim().is_empty()),
    )
}
