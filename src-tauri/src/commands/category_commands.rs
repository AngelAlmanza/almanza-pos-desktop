use crate::db::Database;
use crate::db::repository::category_repo;
use crate::models::category::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use tauri::State;

#[tauri::command]
pub fn get_categories(db: State<Database>) -> Result<Vec<Category>, String> {
    category_repo::find_all(&db)
}

#[tauri::command]
pub fn get_category(db: State<Database>, id: i64) -> Result<Category, String> {
    category_repo::find_by_id(&db, id)?.ok_or_else(|| "Categoría no encontrada".to_string())
}

#[tauri::command]
pub fn create_category(db: State<Database>, request: CreateCategoryRequest) -> Result<Category, String> {
    let existing_category = category_repo::find_by_name(&db, &request.name)?;
    if existing_category.is_some() {
        return Err(format!("La categoría {} ya existe", request.name));
    }

    category_repo::create(&db, &request.name, request.description.as_deref())
}

#[tauri::command]
pub fn update_category(db: State<Database>, request: UpdateCategoryRequest) -> Result<Category, String> {
    if let Some(ref name) = request.name {
        let existing_category = category_repo::find_by_name(&db, name)?;
        if existing_category.is_some() && existing_category.unwrap().id != request.id { // si la categoría existe y no es la misma categoría
            return Err(format!("La categoría {} ya existe", name.to_string()));
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
pub fn delete_category(db: State<Database>, id: i64) -> Result<(), String> {
    category_repo::delete(&db, id)
}
