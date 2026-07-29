use crate::models::category::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use crate::shared::error::{AppError, AppResult};

pub trait CategoryRepository {
    fn find_all(&self) -> AppResult<Vec<Category>>;
    fn find_by_id(&self, id: i64) -> AppResult<Option<Category>>;
    fn find_by_name(&self, name: &str) -> AppResult<Option<Category>>;
    fn create(&self, name: &str, description: Option<&str>) -> AppResult<Category>;
    fn update(&self, id: i64, name: Option<&str>, description: Option<&str>)
        -> AppResult<Category>;
    fn delete(&self, id: i64) -> AppResult<()>;
}

pub fn get_categories(repository: &impl CategoryRepository) -> AppResult<Vec<Category>> {
    repository.find_all()
}

pub fn get_category(repository: &impl CategoryRepository, id: i64) -> AppResult<Category> {
    repository
        .find_by_id(id)?
        .ok_or_else(|| AppError::NotFound("Categoría no encontrada".to_string()))
}

pub fn create_category(
    repository: &impl CategoryRepository,
    request: CreateCategoryRequest,
) -> AppResult<Category> {
    if repository.find_by_name(&request.name)?.is_some() {
        return Err(AppError::Conflict(format!(
            "La categoría {} ya existe",
            request.name
        )));
    }

    repository.create(&request.name, request.description.as_deref())
}

pub fn update_category(
    repository: &impl CategoryRepository,
    request: UpdateCategoryRequest,
) -> AppResult<Category> {
    if let Some(name) = request.name.as_deref() {
        if let Some(existing) = repository.find_by_name(name)? {
            if existing.id != request.id {
                return Err(AppError::Conflict(format!("La categoría {name} ya existe")));
            }
        }
    }

    repository.update(
        request.id,
        request.name.as_deref(),
        request.description.as_deref(),
    )
}

pub fn delete_category(repository: &impl CategoryRepository, id: i64) -> AppResult<()> {
    repository.delete(id)
}
