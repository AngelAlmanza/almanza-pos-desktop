use crate::infrastructure::sqlite::Database;
use crate::models::product::{CreateProductRequest, Product, UpdateProductRequest};
use crate::modules::catalog::products::{
    adapters::outbound::sqlite::SqliteProductRepository, application,
};
use crate::shared::error::AppResult;
use tauri::State;

#[tauri::command]
pub fn get_products(db: State<Database>) -> AppResult<Vec<Product>> {
    application::get_products(&SqliteProductRepository::new(&db))
}

#[tauri::command]
pub fn get_active_products(db: State<Database>) -> AppResult<Vec<Product>> {
    application::get_active_products(&SqliteProductRepository::new(&db))
}

#[tauri::command]
pub fn get_product(db: State<Database>, id: i64) -> AppResult<Product> {
    application::get_product(&SqliteProductRepository::new(&db), id)
}

#[tauri::command]
pub fn find_product_by_barcode(db: State<Database>, barcode: String) -> AppResult<Product> {
    application::find_product_by_barcode(&SqliteProductRepository::new(&db), barcode)
}

#[tauri::command]
pub fn search_products(db: State<Database>, term: String) -> AppResult<Vec<Product>> {
    application::search_products(&SqliteProductRepository::new(&db), term)
}

#[tauri::command]
pub fn create_product(db: State<Database>, request: CreateProductRequest) -> AppResult<Product> {
    application::create_product(&SqliteProductRepository::new(&db), request)
}

#[tauri::command]
pub fn update_product(db: State<Database>, request: UpdateProductRequest) -> AppResult<Product> {
    application::update_product(&SqliteProductRepository::new(&db), request)
}

#[tauri::command]
pub fn delete_product(db: State<Database>, id: i64) -> AppResult<()> {
    application::delete_product(&SqliteProductRepository::new(&db), id)
}
