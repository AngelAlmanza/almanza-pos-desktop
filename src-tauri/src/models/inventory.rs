use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAdjustment {
    pub id: i64,
    pub product_id: i64,
    pub product_name: Option<String>,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub adjustment_type: String, // "add", "positive", "negative"
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
