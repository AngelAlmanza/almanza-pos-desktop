use crate::db::repository::product_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::product::{CreateProductRequest, Product, UpdateProductRequest};
use tauri::State;

const BULK_UNITS: [&str; 3] = ["kg", "litro", "metro"];

fn validate_bulk_configuration(is_bulk: bool, unit: &str) -> AppResult<()> {
    if is_bulk && !BULK_UNITS.contains(&unit) {
        return Err(AppError::Validation(
            "Los productos a granel deben usar kg, litro o metro como unidad base".to_string(),
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn get_products(db: State<Database>) -> AppResult<Vec<Product>> {
    product_repo::find_all(&db)
}

#[tauri::command]
pub fn get_active_products(db: State<Database>) -> AppResult<Vec<Product>> {
    product_repo::find_active(&db)
}

#[tauri::command]
pub fn get_product(db: State<Database>, id: i64) -> AppResult<Product> {
    product_repo::find_by_id(&db, id)?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))
}

#[tauri::command]
pub fn find_product_by_barcode(db: State<Database>, barcode: String) -> AppResult<Product> {
    product_repo::find_by_barcode(&db, &barcode)?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado con ese código de barras".to_string()))
}

#[tauri::command]
pub fn search_products(db: State<Database>, term: String) -> AppResult<Vec<Product>> {
    product_repo::search(&db, &term)
}

#[tauri::command]
pub fn create_product(db: State<Database>, request: CreateProductRequest) -> AppResult<Product> {
    if request.name.trim().is_empty() {
        return Err(AppError::Validation(
            "El nombre del producto no puede estar vacío".to_string(),
        ));
    }
    if request.price < 0.0 {
        return Err(AppError::Validation(
            "El precio no puede ser negativo".to_string(),
        ));
    }
    if request.stock.unwrap_or(0.0) < 0.0 {
        return Err(AppError::Validation(
            "El stock inicial no puede ser negativo".to_string(),
        ));
    }
    if request.min_stock.unwrap_or(0.0) < 0.0 {
        return Err(AppError::Validation(
            "El stock mínimo no puede ser negativo".to_string(),
        ));
    }

    validate_bulk_configuration(request.is_bulk, &request.unit)?;

    if let Some(ref barcode) = request.barcode {
        if product_repo::find_by_barcode(&db, barcode)?.is_some() {
            return Err(AppError::Conflict(format!(
                "El producto con código de barras {} ya existe",
                barcode
            )));
        }
    }

    product_repo::create(
        &db,
        &request.name,
        request.description.as_deref(),
        request.barcode.as_deref(),
        request.price,
        &request.unit,
        request.is_bulk,
        request.category_id,
        request.stock.unwrap_or(0.0),
        request.min_stock.unwrap_or(0.0),
    )
}

#[tauri::command]
pub fn update_product(db: State<Database>, request: UpdateProductRequest) -> AppResult<Product> {
    let current = product_repo::find_by_id(&db, request.id)?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))?;

    if let Some(ref name) = request.name {
        if name.trim().is_empty() {
            return Err(AppError::Validation(
                "El nombre del producto no puede estar vacío".to_string(),
            ));
        }
    }
    if let Some(price) = request.price {
        if price < 0.0 {
            return Err(AppError::Validation(
                "El precio no puede ser negativo".to_string(),
            ));
        }
    }
    if let Some(min_stock) = request.min_stock {
        if min_stock < 0.0 {
            return Err(AppError::Validation(
                "El stock mínimo no puede ser negativo".to_string(),
            ));
        }
    }

    let resulting_unit = request.unit.as_deref().unwrap_or(&current.unit);
    let resulting_is_bulk = request.is_bulk.unwrap_or(current.is_bulk);
    validate_bulk_configuration(resulting_is_bulk, resulting_unit)?;

    if let Some(ref barcode) = request.barcode {
        let existing = product_repo::find_by_barcode(&db, barcode)?;
        if existing.is_some() && existing.unwrap().id != request.id {
            return Err(AppError::Conflict(format!(
                "El producto con código de barras {} ya existe",
                barcode
            )));
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
        request.is_bulk,
        request.category_id,
        request.min_stock,
        request.active,
    )
}

#[tauri::command]
pub fn delete_product(db: State<Database>, id: i64) -> AppResult<()> {
    product_repo::delete(&db, id)
}

#[cfg(test)]
mod tests {
    use super::validate_bulk_configuration;

    #[test]
    fn accepts_supported_bulk_units() {
        for unit in ["kg", "litro", "metro"] {
            assert!(validate_bulk_configuration(true, unit).is_ok());
        }
    }

    #[test]
    fn rejects_discrete_units_for_bulk_products() {
        assert!(validate_bulk_configuration(true, "pieza").is_err());
    }

    #[test]
    fn non_bulk_products_do_not_require_a_convertible_unit() {
        assert!(validate_bulk_configuration(false, "pieza").is_ok());
        assert!(validate_bulk_configuration(false, "kg").is_ok());
    }
}
