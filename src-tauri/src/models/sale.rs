use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sale {
    pub id: i64,
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub user_name: Option<String>,
    pub total: f64,
    pub payment_method: String,
    pub payment_amount: f64,
    pub change_amount: f64,
    pub status: String,
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
    pub unit_price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub payment_method: String,
    pub payment_amount: f64,
    pub items: Vec<CreateSaleItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleItemRequest {
    pub product_id: i64,
    pub quantity: f64,
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
