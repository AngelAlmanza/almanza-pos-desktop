use serde::{Deserialize, Serialize};

/// Represents how an inventory adjustment changes the stock level.
/// The `adjustment_type` column stores the lowercase string form.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AdjustmentType {
    /// Add stock (purchase, correction upwards).
    Add,
    /// Alias for `Add` accepted from legacy clients.
    Positive,
    /// Remove stock (loss, damage, correction downwards).
    Negative,
}

impl AdjustmentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Add => "add",
            Self::Positive => "positive",
            Self::Negative => "negative",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "add" => Some(Self::Add),
            "positive" => Some(Self::Positive),
            "negative" => Some(Self::Negative),
            _ => None,
        }
    }

    /// Returns `true` if this type increases stock.
    pub fn is_positive(&self) -> bool {
        matches!(self, Self::Add | Self::Positive)
    }
}

impl rusqlite::types::FromSql for AdjustmentType {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = String::column_result(value)?;
        AdjustmentType::parse(&s).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(format!("invalid adjustment type: {}", s).into())
        })
    }
}

impl rusqlite::types::ToSql for AdjustmentType {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(
            self.as_str().to_string(),
        )))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAdjustment {
    pub id: i64,
    pub product_id: i64,
    pub product_name: Option<String>,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub adjustment_type: AdjustmentType,
    pub quantity: f64,
    pub previous_stock: f64,
    pub new_stock: f64,
    pub reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateInventoryAdjustmentRequest {
    pub product_id: i64,
    pub user_id: i64,
    pub adjustment_type: String,
    pub quantity: f64,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetInventoryAdjustmentsByDateRangeRequest {
    pub start_date: String,
    pub end_date: String,
}
