use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub price: f64,
    pub unit: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub stock: f64,
    pub min_stock: f64,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub price: f64,
    pub unit: String,
    pub category_id: Option<i64>,
    pub stock: Option<f64>,
    pub min_stock: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub id: i64,
    pub name: Option<String>,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub price: Option<f64>,
    pub unit: Option<String>,
    pub category_id: Option<i64>,
    pub min_stock: Option<f64>,
    pub active: Option<bool>,
}
