use crate::db::repository::inventory_repo;
use crate::db::Database;
use crate::models::inventory::{
    CreateInventoryAdjustmentRequest, GetInventoryAdjustmentsByDateRangeRequest,
    InventoryAdjustment,
};
use tauri::State;

#[tauri::command]
pub fn get_inventory_adjustments(db: State<Database>) -> Result<Vec<InventoryAdjustment>, String> {
    inventory_repo::find_all(&db)
}

#[tauri::command]
pub fn get_inventory_adjustments_by_date_range(
    db: State<Database>,
    request: GetInventoryAdjustmentsByDateRangeRequest,
) -> Result<Vec<InventoryAdjustment>, String> {
    inventory_repo::find_by_date_range(&db, &request.start_date, &request.end_date)
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
    inventory_repo::create(
        &db,
        request.product_id,
        request.user_id,
        &request.adjustment_type,
        request.quantity,
        request.reason.as_deref(),
    )
}
