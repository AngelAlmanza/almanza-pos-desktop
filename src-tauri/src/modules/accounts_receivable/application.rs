use crate::models::cash_register::SessionStatus;
use crate::models::customer::{
    CreateCustomerPaymentRequest, CreateCustomerRequest, Customer, CustomerAccountMovement,
    UpdateCustomerRequest,
};
use crate::modules::cash_register::application::CashRegisterSessionLookup;
use crate::shared::error::{AppError, AppResult};
use crate::shared::money;

pub trait CustomerRepository {
    fn default_credit_limit(&self) -> AppResult<f64>;
    fn find_all(&self, active_only: bool) -> AppResult<Vec<Customer>>;
    fn find_by_id(&self, id: i64) -> AppResult<Option<Customer>>;
    fn create(
        &self,
        name: &str,
        phone: Option<&str>,
        notes: Option<&str>,
        credit_limit: f64,
    ) -> AppResult<Customer>;
    fn update(
        &self,
        request: &UpdateCustomerRequest,
        credit_limit: Option<f64>,
    ) -> AppResult<Customer>;
    fn find_movements(&self, customer_id: i64) -> AppResult<Vec<CustomerAccountMovement>>;
    fn register_payment(
        &self,
        request: &CreateCustomerPaymentRequest,
        exchange_rate: Option<f64>,
        notes: Option<&str>,
    ) -> AppResult<CustomerAccountMovement>;
}

pub fn get_customers(
    repository: &impl CustomerRepository,
    active_only: bool,
) -> AppResult<Vec<Customer>> {
    repository.find_all(active_only)
}

pub fn get_customer(repository: &impl CustomerRepository, id: i64) -> AppResult<Customer> {
    repository
        .find_by_id(id)?
        .ok_or_else(|| AppError::NotFound("Cliente no encontrado".to_string()))
}

pub fn create_customer(
    repository: &impl CustomerRepository,
    request: CreateCustomerRequest,
) -> AppResult<Customer> {
    let name = request.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "El nombre del cliente es obligatorio".to_string(),
        ));
    }
    let limit = validate_limit(
        request
            .credit_limit
            .unwrap_or(repository.default_credit_limit()?),
    )?;
    repository.create(
        name,
        request
            .phone
            .as_deref()
            .filter(|value| !value.trim().is_empty()),
        request
            .notes
            .as_deref()
            .filter(|value| !value.trim().is_empty()),
        limit,
    )
}

pub fn update_customer(
    repository: &impl CustomerRepository,
    request: UpdateCustomerRequest,
) -> AppResult<Customer> {
    if request
        .name
        .as_deref()
        .is_some_and(|name| name.trim().is_empty())
    {
        return Err(AppError::Validation(
            "El nombre del cliente es obligatorio".to_string(),
        ));
    }
    let limit = request.credit_limit.map(validate_limit).transpose()?;
    repository.update(&request, limit)
}

pub fn get_customer_movements(
    repository: &impl CustomerRepository,
    customer_id: i64,
) -> AppResult<Vec<CustomerAccountMovement>> {
    let _ = get_customer(repository, customer_id)?;
    repository.find_movements(customer_id)
}

pub fn register_customer_payment(
    repository: &impl CustomerRepository,
    sessions: &impl CashRegisterSessionLookup,
    request: CreateCustomerPaymentRequest,
) -> AppResult<CustomerAccountMovement> {
    let session = sessions
        .find_by_id(request.cash_register_session_id)?
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
    let notes = request
        .notes
        .as_deref()
        .filter(|value| !value.trim().is_empty());
    repository.register_payment(&request, session.exchange_rate, notes)
}

fn validate_limit(limit: f64) -> AppResult<f64> {
    if !limit.is_finite() || limit < 0.0 {
        Err(AppError::Validation(
            "El límite de crédito debe ser un monto válido mayor o igual a cero".to_string(),
        ))
    } else {
        Ok(money::round2(limit))
    }
}
