use crate::constants::{DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE};
use crate::models::inventory::{
    AdjustmentType, CreateInventoryAdjustmentRequest, GetInventoryAdjustmentsByDateRangeRequest,
    InventoryAdjustment,
};
use crate::shared::error::{AppError, AppResult};
use crate::shared::pagination::PaginatedResult;

pub trait InventoryRepository {
    fn find_all(&self) -> AppResult<Vec<InventoryAdjustment>>;
    fn find_by_date_range_paginated(
        &self,
        start_date: &str,
        end_date: &str,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<InventoryAdjustment>, i64)>;
    fn find_by_product(&self, product_id: i64) -> AppResult<Vec<InventoryAdjustment>>;
    fn create(
        &self,
        product_id: i64,
        user_id: i64,
        adjustment_type: AdjustmentType,
        quantity: f64,
        reason: Option<&str>,
    ) -> AppResult<InventoryAdjustment>;
}

/// Boundary reserved for sales: its SQLite implementation will receive the
/// same transaction owned by `SalesUnitOfWork`, not an independent connection.
#[allow(dead_code)]
pub trait StockMutationPort {
    fn decrease_stock(&self, product_id: i64, quantity: f64) -> AppResult<()>;
    fn restore_stock(&self, product_id: i64, quantity: f64) -> AppResult<()>;
}

pub fn get_adjustments(
    repository: &impl InventoryRepository,
) -> AppResult<Vec<InventoryAdjustment>> {
    repository.find_all()
}

pub fn get_adjustments_by_date_range(
    repository: &impl InventoryRepository,
    request: GetInventoryAdjustmentsByDateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<InventoryAdjustment>> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);
    let (data, total) = repository.find_by_date_range_paginated(
        &request.start_date,
        &request.end_date,
        page,
        page_size,
    )?;
    Ok(PaginatedResult {
        data,
        total,
        page,
        page_size,
    })
}

pub fn get_adjustments_by_product(
    repository: &impl InventoryRepository,
    product_id: i64,
) -> AppResult<Vec<InventoryAdjustment>> {
    repository.find_by_product(product_id)
}

pub fn create_adjustment(
    repository: &impl InventoryRepository,
    request: CreateInventoryAdjustmentRequest,
) -> AppResult<InventoryAdjustment> {
    if request.quantity <= 0.0 {
        return Err(AppError::Validation(
            "La cantidad del ajuste debe ser mayor a cero".to_string(),
        ));
    }
    let adjustment_type = AdjustmentType::parse(&request.adjustment_type).ok_or_else(|| {
        AppError::Validation(
            "Tipo de ajuste inválido. Debe ser 'add', 'positive' o 'negative'".to_string(),
        )
    })?;
    repository.create(
        request.product_id,
        request.user_id,
        adjustment_type,
        request.quantity,
        request.reason.as_deref(),
    )
}
