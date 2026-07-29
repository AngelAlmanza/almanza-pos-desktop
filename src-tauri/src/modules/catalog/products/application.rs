use crate::models::product::{CreateProductRequest, Product, UpdateProductRequest};
use crate::shared::error::{AppError, AppResult};

const BULK_UNITS: [&str; 3] = ["kg", "litro", "metro"];

pub trait ProductRepository {
    fn find_all(&self) -> AppResult<Vec<Product>>;
    fn find_active(&self) -> AppResult<Vec<Product>>;
    fn find_by_id(&self, id: i64) -> AppResult<Option<Product>>;
    fn find_by_barcode(&self, barcode: &str) -> AppResult<Option<Product>>;
    fn search(&self, term: &str) -> AppResult<Vec<Product>>;
    fn create(&self, request: &CreateProductRequest) -> AppResult<Product>;
    fn update(&self, request: &UpdateProductRequest) -> AppResult<Product>;
    fn delete(&self, id: i64) -> AppResult<()>;
}

pub fn get_products(repository: &impl ProductRepository) -> AppResult<Vec<Product>> {
    repository.find_all()
}

pub fn get_active_products(repository: &impl ProductRepository) -> AppResult<Vec<Product>> {
    repository.find_active()
}

pub fn get_product(repository: &impl ProductRepository, id: i64) -> AppResult<Product> {
    repository
        .find_by_id(id)?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))
}

pub fn find_product_by_barcode(
    repository: &impl ProductRepository,
    barcode: String,
) -> AppResult<Product> {
    repository.find_by_barcode(&barcode)?.ok_or_else(|| {
        AppError::NotFound("Producto no encontrado con ese código de barras".to_string())
    })
}

pub fn search_products(
    repository: &impl ProductRepository,
    term: String,
) -> AppResult<Vec<Product>> {
    repository.search(&term)
}

pub fn create_product(
    repository: &impl ProductRepository,
    request: CreateProductRequest,
) -> AppResult<Product> {
    validate_create_request(&request)?;
    if let Some(barcode) = request.barcode.as_deref() {
        if repository.find_by_barcode(barcode)?.is_some() {
            return Err(AppError::Conflict(format!(
                "El producto con código de barras {barcode} ya existe"
            )));
        }
    }
    repository.create(&request)
}

pub fn update_product(
    repository: &impl ProductRepository,
    request: UpdateProductRequest,
) -> AppResult<Product> {
    let current = get_product(repository, request.id)?;
    validate_update_request(&request, &current)?;

    if let Some(barcode) = request.barcode.as_deref() {
        if let Some(existing) = repository.find_by_barcode(barcode)? {
            if existing.id != request.id {
                return Err(AppError::Conflict(format!(
                    "El producto con código de barras {barcode} ya existe"
                )));
            }
        }
    }
    repository.update(&request)
}

pub fn delete_product(repository: &impl ProductRepository, id: i64) -> AppResult<()> {
    repository.delete(id)
}

fn validate_create_request(request: &CreateProductRequest) -> AppResult<()> {
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
    validate_bulk_configuration(request.is_bulk, &request.unit)
}

fn validate_update_request(request: &UpdateProductRequest, current: &Product) -> AppResult<()> {
    if request
        .name
        .as_deref()
        .is_some_and(|name| name.trim().is_empty())
    {
        return Err(AppError::Validation(
            "El nombre del producto no puede estar vacío".to_string(),
        ));
    }
    if request.price.is_some_and(|price| price < 0.0) {
        return Err(AppError::Validation(
            "El precio no puede ser negativo".to_string(),
        ));
    }
    if request.min_stock.is_some_and(|stock| stock < 0.0) {
        return Err(AppError::Validation(
            "El stock mínimo no puede ser negativo".to_string(),
        ));
    }

    validate_bulk_configuration(
        request.is_bulk.unwrap_or(current.is_bulk),
        request.unit.as_deref().unwrap_or(&current.unit),
    )
}

fn validate_bulk_configuration(is_bulk: bool, unit: &str) -> AppResult<()> {
    if is_bulk && !BULK_UNITS.contains(&unit) {
        return Err(AppError::Validation(
            "Los productos a granel deben usar kg, litro o metro como unidad base".to_string(),
        ));
    }
    Ok(())
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
