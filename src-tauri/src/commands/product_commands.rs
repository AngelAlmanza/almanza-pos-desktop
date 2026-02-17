use crate::db::Database;
use crate::db::repository::product_repo;
use crate::models::product::{CreateProductRequest, Product, UpdateProductRequest};
use tauri::State;

#[tauri::command]
pub fn get_products(db: State<Database>) -> Result<Vec<Product>, String> {
    product_repo::find_all(&db)
}

#[tauri::command]
pub fn get_active_products(db: State<Database>) -> Result<Vec<Product>, String> {
    product_repo::find_active(&db)
}

#[tauri::command]
pub fn get_product(db: State<Database>, id: i64) -> Result<Product, String> {
    product_repo::find_by_id(&db, id)?.ok_or_else(|| "Producto no encontrado".to_string())
}

#[tauri::command]
pub fn find_product_by_barcode(db: State<Database>, barcode: String) -> Result<Product, String> {
    product_repo::find_by_barcode(&db, &barcode)?
        .ok_or_else(|| "Producto no encontrado con ese código de barras".to_string())
}

#[tauri::command]
pub fn search_products(db: State<Database>, term: String) -> Result<Vec<Product>, String> {
    product_repo::search(&db, &term)
}

#[tauri::command]
pub fn create_product(db: State<Database>, request: CreateProductRequest) -> Result<Product, String> {
    if let Some(ref barcode) = request.barcode {
        let existing_product = product_repo::find_by_barcode(&db, barcode)?;
        if existing_product.is_some() {
            return Err(format!("El producto con código de barras {} ya existe", barcode.to_string()));
        }
    }

    product_repo::create(
        &db,
        &request.name,
        request.description.as_deref(),
        request.barcode.as_deref(),
        request.price,
        &request.unit,
        request.category_id,
        request.stock.unwrap_or(0.0),
        request.min_stock.unwrap_or(0.0),
    )
}

#[tauri::command]
pub fn update_product(db: State<Database>, request: UpdateProductRequest) -> Result<Product, String> {
    if let Some(ref barcode) = request.barcode {
        let existing_product = product_repo::find_by_barcode(&db, barcode)?;
        if existing_product.is_some() && existing_product.unwrap().id != request.id { // si el producto existe y no es el mismo producto
            return Err(format!("El producto con código de barras {} ya existe", barcode.to_string()));
        }
    }

    product_repo::update(
        &db,
        request.id,
        request.name.as_deref(),
        request.description.as_deref(),
        request.barcode.as_deref(),
        request.price,
        request.unit.as_deref(),
        request.category_id,
        request.min_stock,
        request.active,
    )
}

#[tauri::command]
pub fn update_product_stock(db: State<Database>, id: i64, stock: f64) -> Result<(), String> {
    product_repo::update_stock(&db, id, stock)
}

#[tauri::command]
pub fn delete_product(db: State<Database>, id: i64) -> Result<(), String> {
    product_repo::delete(&db, id)
}
