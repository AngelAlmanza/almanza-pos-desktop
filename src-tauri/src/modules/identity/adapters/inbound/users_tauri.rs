use crate::infrastructure::sqlite::Database;
use crate::models::user::{CreateUserRequest, UpdateUserRequest, User};
use crate::modules::identity::adapters::outbound::sqlite::SqliteUserRepository;
use crate::modules::identity::application;
use crate::shared::error::AppResult;
use tauri::State;

#[tauri::command]
pub fn get_users(db: State<Database>) -> AppResult<Vec<User>> {
    application::get_users(&SqliteUserRepository::new(&db))
}

#[tauri::command]
pub fn get_user(db: State<Database>, id: i64) -> AppResult<User> {
    application::get_user(&SqliteUserRepository::new(&db), id)
}

#[tauri::command]
pub fn create_user(db: State<Database>, request: CreateUserRequest) -> AppResult<User> {
    application::create_user(&SqliteUserRepository::new(&db), request)
}

#[tauri::command]
pub fn update_user(db: State<Database>, request: UpdateUserRequest) -> AppResult<User> {
    application::update_user(&SqliteUserRepository::new(&db), request)
}

#[tauri::command]
pub fn delete_user(db: State<Database>, id: i64) -> AppResult<()> {
    application::delete_user(&SqliteUserRepository::new(&db), id)
}
