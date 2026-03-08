use crate::db::repository::inventory_repo;
use crate::db::Database;
use crate::models::inventory::{
    CreateInventoryAdjustmentRequest, GetInventoryAdjustmentsByDateRangeRequest,
    InventoryAdjustment,
};
use crate::models::shared::PaginatedResult;
use tauri::State;

const DEFAULT_PAGE_SIZE: i64 = 50;

#[tauri::command]
pub fn get_inventory_adjustments(db: State<Database>) -> Result<Vec<InventoryAdjustment>, String> {
    inventory_repo::find_all(&db)
}

#[tauri::command]
pub fn get_inventory_adjustments_by_date_range(
    db: State<Database>,
    request: GetInventoryAdjustmentsByDateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<PaginatedResult<InventoryAdjustment>, String> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(DEFAULT_PAGE_SIZE).clamp(1, 200);
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
) -> Result<Vec<InventoryAdjustment>, String> {
    inventory_repo::find_by_product(&db, product_id)
}

#[tauri::command]
pub fn create_inventory_adjustment(
    db: State<Database>,
    request: CreateInventoryAdjustmentRequest,
) -> Result<InventoryAdjustment, String> {
    if request.quantity <= 0.0 {
        return Err("La cantidad del ajuste debe ser mayor a cero".to_string());
    }

    inventory_repo::create(
        &db,
        request.product_id,
        request.user_id,
        &request.adjustment_type,
        request.quantity,
        request.reason.as_deref(),
    )
}
