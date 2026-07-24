use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CustomerMovementType {
    SaleCharge,
    AccountPayment,
}

impl CustomerMovementType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SaleCharge => "sale_charge",
            Self::AccountPayment => "account_payment",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "sale_charge" => Some(Self::SaleCharge),
            "account_payment" => Some(Self::AccountPayment),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for CustomerMovementType {
    fn column_result(
        value: rusqlite::types::ValueRef<'_>,
    ) -> rusqlite::types::FromSqlResult<Self> {
        let value = String::column_result(value)?;
        Self::parse(&value).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(
                format!("invalid customer movement type: {}", value).into(),
            )
        })
    }
}

impl rusqlite::types::ToSql for CustomerMovementType {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(
            rusqlite::types::Value::Text(self.as_str().to_string()),
        ))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub credit_limit: f64,
    pub active: bool,
    pub balance: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerAccountMovement {
    pub id: i64,
    pub customer_id: i64,
    /// Calculated from the current customer relation; never persisted as a snapshot.
    pub customer_name: String,
    pub sale_id: Option<i64>,
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub movement_type: CustomerMovementType,
    pub amount: f64,
    pub payment_cash_mxn: f64,
    pub payment_cash_usd: f64,
    pub payment_transfer: f64,
    pub exchange_rate: Option<f64>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub credit_limit: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomerRequest {
    pub id: i64,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub credit_limit: Option<f64>,
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCustomerPaymentRequest {
    pub customer_id: i64,
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub payment_cash_mxn: f64,
    pub payment_cash_usd: f64,
    pub payment_transfer: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CustomerReportMetrics {
    pub total_credit_sold: f64,
    pub total_account_collected: f64,
    pub outstanding_balance: f64,
    pub top_debtors: Vec<Customer>,
}
