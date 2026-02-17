use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashRegisterSession {
    pub id: i64,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub opening_amount: f64,
    pub closing_amount: Option<f64>,
    pub exchange_rate: Option<f64>,
    pub status: String, // "open" or "closed"
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub total_sales: Option<f64>,
    pub total_transactions: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct OpenCashRegisterRequest {
    pub user_id: i64,
    pub opening_amount: f64,
    pub exchange_rate: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CloseCashRegisterRequest {
    pub session_id: i64,
    pub closing_amount: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CashRegisterSummary {
    pub session: CashRegisterSession,
    pub total_sales: f64,
    pub total_transactions: i64,
    pub total_cash: f64,
    pub expected_cash: f64,
    pub difference: f64,
}

#[derive(Debug, Deserialize)]
pub struct DateRangeRequest {
    pub start_date: String,
    pub end_date: String,
}