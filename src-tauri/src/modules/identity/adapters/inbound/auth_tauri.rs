use crate::infrastructure::sqlite::Database;
use crate::models::user::{LoginRequest, LoginResponse, User};
use crate::modules::identity::adapters::outbound::sqlite::SqliteUserRepository;
use crate::modules::identity::application;
use crate::shared::error::AppResult;
use tauri::State;

#[tauri::command]
pub fn login(db: State<Database>, request: LoginRequest) -> AppResult<LoginResponse> {
    application::login(&SqliteUserRepository::new(&db), request)
}

#[tauri::command]
pub fn get_current_user(db: State<Database>, user_id: i64) -> AppResult<User> {
    application::get_current_user(&SqliteUserRepository::new(&db), user_id)
}
