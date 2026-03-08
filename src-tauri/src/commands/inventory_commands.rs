use crate::constants::{DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE};
use crate::db::repository::inventory_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::inventory::{
    AdjustmentType, CreateInventoryAdjustmentRequest, GetInventoryAdjustmentsByDateRangeRequest,
    InventoryAdjustment,
};
use crate::models::shared::PaginatedResult;
use tauri::State;

#[tauri::command]
pub fn get_inventory_adjustments(db: State<Database>) -> AppResult<Vec<InventoryAdjustment>> {
    inventory_repo::find_all(&db)
}

#[tauri::command]
pub fn get_inventory_adjustments_by_date_range(
    db: State<Database>,
    request: GetInventoryAdjustmentsByDateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<InventoryAdjustment>> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, MAX_PAGE_SIZE);
    let (data, total) = inventory_repo::find_by_date_range_paginated(
        &db,
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

#[tauri::command]
pub fn get_inventory_adjustments_by_product(
    db: State<Database>,
    product_id: i64,
) -> AppResult<Vec<InventoryAdjustment>> {
    inventory_repo::find_by_product(&db, product_id)
}

#[tauri::command]
pub fn create_inventory_adjustment(
    db: State<Database>,
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

    inventory_repo::create(
        &db,
        request.product_id,
        request.user_id,
        adjustment_type,
        request.quantity,
        request.reason.as_deref(),
    )
}
