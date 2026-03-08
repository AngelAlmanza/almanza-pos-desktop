use crate::db::repository::category_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::category::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use tauri::State;

#[tauri::command]
pub fn get_categories(db: State<Database>) -> AppResult<Vec<Category>> {
    category_repo::find_all(&db)
}

#[tauri::command]
pub fn get_category(db: State<Database>, id: i64) -> AppResult<Category> {
    category_repo::find_by_id(&db, id)?
        .ok_or_else(|| AppError::NotFound("Categoría no encontrada".to_string()))
}

#[tauri::command]
pub fn create_category(db: State<Database>, request: CreateCategoryRequest) -> AppResult<Category> {
    if category_repo::find_by_name(&db, &request.name)?.is_some() {
        return Err(AppError::Conflict(format!(
            "La categoría {} ya existe",
            request.name
        )));
    }

    category_repo::create(&db, &request.name, request.description.as_deref())
}

#[tauri::command]
pub fn update_category(db: State<Database>, request: UpdateCategoryRequest) -> AppResult<Category> {
    if let Some(ref name) = request.name {
        let existing = category_repo::find_by_name(&db, name)?;
        if existing.is_some() && existing.unwrap().id != request.id {
            return Err(AppError::Conflict(format!("La categoría {} ya existe", name)));
        }
    }

    category_repo::update(
        &db,
        request.id,
        request.name.as_deref(),
        request.description.as_deref(),
    )
}

#[tauri::command]
pub fn delete_category(db: State<Database>, id: i64) -> AppResult<()> {
    category_repo::delete(&db, id)
}
