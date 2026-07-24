use serde::{Deserialize, Serialize};

/// Lifecycle state of a sale.
/// The `status` column stores the lowercase string form.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SaleStatus {
    Completed,
    Cancelled,
}

impl SaleStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for SaleStatus {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = String::column_result(value)?;
        SaleStatus::parse(&s).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(format!("invalid sale status: {}", s).into())
        })
    }
}

impl rusqlite::types::ToSql for SaleStatus {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(
            rusqlite::types::Value::Text(self.as_str().to_string()),
        ))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SaleInputMode {
    Base,
    Sub,
    Amount,
}

impl SaleInputMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Base => "base",
            Self::Sub => "sub",
            Self::Amount => "amount",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "base" => Some(Self::Base),
            "sub" => Some(Self::Sub),
            "amount" => Some(Self::Amount),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for SaleInputMode {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let value = String::column_result(value)?;
        SaleInputMode::parse(&value).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(
                format!("invalid sale input mode: {}", value).into(),
            )
        })
    }
}

impl rusqlite::types::ToSql for SaleInputMode {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(self.as_str().into())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sale {
    pub id: i64,
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub total: f64,
    pub payment_method: String,
    pub payment_amount: f64,
    pub payment_cash_mxn: f64,
    pub payment_cash_usd: f64,
    pub payment_transfer: f64,
    pub exchange_rate: Option<f64>,
    pub change_amount: f64,
    pub status: SaleStatus,
    pub created_at: String,
    pub items: Vec<SaleItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub quantity: f64,
    pub base_unit: Option<String>,
    pub input_mode: Option<SaleInputMode>,
    pub input_value: Option<f64>,
    pub input_unit: Option<String>,
    pub unit_price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub payment_cash_mxn: f64,
    pub payment_cash_usd: f64,
    pub payment_transfer: f64,
    pub items: Vec<CreateSaleItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleItemRequest {
    pub product_id: i64,
    pub quantity: f64,
    pub input_mode: SaleInputMode,
    pub input_value: f64,
    pub input_unit: String,
}

#[derive(Debug, Serialize)]
pub struct SalesReport {
    pub total_sales: f64,
    pub total_transactions: i64,
    pub average_sale: f64,
    pub sales: Vec<Sale>,
}

#[derive(Debug, Serialize)]
pub struct TopProduct {
    pub product_id: i64,
    pub product_name: String,
    pub total_quantity: f64,
    pub total_revenue: f64,
}

#[derive(Debug, Deserialize)]
pub struct DateRangeRequest {
    pub start_date: String,
    pub end_date: String,
}
