use serde::{Deserialize, Serialize};

/// Lifecycle state of a cash-register session.
/// The `status` column stores the lowercase string form.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Open,
    Closed,
}

impl SessionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Closed => "closed",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "open" => Some(Self::Open),
            "closed" => Some(Self::Closed),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for SessionStatus {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = String::column_result(value)?;
        SessionStatus::parse(&s).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(format!("invalid session status: {}", s).into())
        })
    }
}

impl rusqlite::types::ToSql for SessionStatus {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(
            self.as_str().to_string(),
        )))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashRegisterSession {
    pub id: i64,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub opening_amount: f64,
    pub closing_amount: Option<f64>,
    pub closing_cash_mxn: Option<f64>,
    pub closing_cash_usd: Option<f64>,
    pub exchange_rate: Option<f64>,
    pub status: SessionStatus,
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
    pub closing_cash_mxn: f64,
    pub closing_cash_usd: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CashRegisterSummary {
    pub session: CashRegisterSession,
    pub total_sales: f64,
    pub total_transactions: i64,
    pub sales_cash_mxn: f64,
    pub sales_cash_usd: f64,
    pub sales_transfer: f64,
    pub total_change_given: f64,
    pub expected_cash_mxn: f64,
    pub expected_cash_usd: f64,
    pub actual_cash_mxn: f64,
    pub actual_cash_usd: f64,
    pub difference_mxn: f64,
    pub difference_usd: f64,
}

#[derive(Debug, Deserialize)]
pub struct DateRangeRequest {
    pub start_date: String,
    pub end_date: String,
}
