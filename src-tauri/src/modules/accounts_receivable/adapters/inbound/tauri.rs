use crate::infrastructure::sqlite::Database;
use crate::models::customer::{
    CreateCustomerPaymentRequest, CreateCustomerRequest, Customer, CustomerAccountMovement,
    UpdateCustomerRequest,
};
use crate::modules::{
    accounts_receivable::{adapters::outbound::sqlite::SqliteCustomerRepository, application},
    cash_register::adapters::outbound::sqlite::SqliteCashRegisterRepository,
};
use crate::shared::error::AppResult;
use tauri::State;

#[tauri::command]
pub fn get_customers(db: State<Database>) -> AppResult<Vec<Customer>> {
    application::get_customers(&SqliteCustomerRepository::new(&db), false)
}
#[tauri::command]
pub fn get_active_customers(db: State<Database>) -> AppResult<Vec<Customer>> {
    application::get_customers(&SqliteCustomerRepository::new(&db), true)
}
#[tauri::command]
pub fn get_customer(db: State<Database>, id: i64) -> AppResult<Customer> {
    application::get_customer(&SqliteCustomerRepository::new(&db), id)
}
#[tauri::command]
pub fn create_customer(db: State<Database>, request: CreateCustomerRequest) -> AppResult<Customer> {
    application::create_customer(&SqliteCustomerRepository::new(&db), request)
}
#[tauri::command]
pub fn update_customer(db: State<Database>, request: UpdateCustomerRequest) -> AppResult<Customer> {
    application::update_customer(&SqliteCustomerRepository::new(&db), request)
}
#[tauri::command]
pub fn get_customer_movements(
    db: State<Database>,
    customer_id: i64,
) -> AppResult<Vec<CustomerAccountMovement>> {
    application::get_customer_movements(&SqliteCustomerRepository::new(&db), customer_id)
}
#[tauri::command]
pub fn register_customer_payment(
    db: State<Database>,
    request: CreateCustomerPaymentRequest,
) -> AppResult<CustomerAccountMovement> {
    application::register_customer_payment(
        &SqliteCustomerRepository::new(&db),
        &SqliteCashRegisterRepository::new(&db),
        request,
    )
}
