use crate::infrastructure::sqlite::Database;
use crate::models::category::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use crate::modules::catalog::categories::{
    adapters::outbound::sqlite::SqliteCategoryRepository, application,
};
use crate::shared::error::AppResult;
use tauri::State;

#[tauri::command]
pub fn get_categories(db: State<Database>) -> AppResult<Vec<Category>> {
    application::get_categories(&SqliteCategoryRepository::new(&db))
}

#[tauri::command]
pub fn get_category(db: State<Database>, id: i64) -> AppResult<Category> {
    application::get_category(&SqliteCategoryRepository::new(&db), id)
}

#[tauri::command]
pub fn create_category(db: State<Database>, request: CreateCategoryRequest) -> AppResult<Category> {
    application::create_category(&SqliteCategoryRepository::new(&db), request)
}

#[tauri::command]
pub fn update_category(db: State<Database>, request: UpdateCategoryRequest) -> AppResult<Category> {
    application::update_category(&SqliteCategoryRepository::new(&db), request)
}

#[tauri::command]
pub fn delete_category(db: State<Database>, id: i64) -> AppResult<()> {
    application::delete_category(&SqliteCategoryRepository::new(&db), id)
}
