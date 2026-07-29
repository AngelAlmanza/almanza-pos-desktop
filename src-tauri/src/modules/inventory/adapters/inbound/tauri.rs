use crate::infrastructure::sqlite::Database;
use crate::models::inventory::{
    CreateInventoryAdjustmentRequest, GetInventoryAdjustmentsByDateRangeRequest,
    InventoryAdjustment,
};
use crate::modules::inventory::{
    adapters::outbound::sqlite::SqliteInventoryRepository, application,
};
use crate::shared::error::AppResult;
use crate::shared::pagination::PaginatedResult;
use tauri::State;

#[tauri::command]
pub fn get_inventory_adjustments(db: State<Database>) -> AppResult<Vec<InventoryAdjustment>> {
    application::get_adjustments(&SqliteInventoryRepository::new(&db))
}
#[tauri::command]
pub fn get_inventory_adjustments_by_date_range(
    db: State<Database>,
    request: GetInventoryAdjustmentsByDateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<InventoryAdjustment>> {
    application::get_adjustments_by_date_range(
        &SqliteInventoryRepository::new(&db),
        request,
        page,
        page_size,
    )
}
#[tauri::command]
pub fn get_inventory_adjustments_by_product(
    db: State<Database>,
    product_id: i64,
) -> AppResult<Vec<InventoryAdjustment>> {
    application::get_adjustments_by_product(&SqliteInventoryRepository::new(&db), product_id)
}
#[tauri::command]
pub fn create_inventory_adjustment(
    db: State<Database>,
    request: CreateInventoryAdjustmentRequest,
) -> AppResult<InventoryAdjustment> {
    application::create_adjustment(&SqliteInventoryRepository::new(&db), request)
}
