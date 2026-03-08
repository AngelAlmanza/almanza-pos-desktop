use crate::db::repository::user_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::user::{LoginRequest, LoginResponse, User};
use tauri::State;

#[tauri::command]
pub fn login(db: State<Database>, request: LoginRequest) -> AppResult<LoginResponse> {
    let result = user_repo::find_by_username(&db, &request.username)?;

    match result {
        Some((user, password_hash)) => {
            if !user.active {
                return Err(AppError::Auth("Usuario desactivado".to_string()));
            }

            let valid = bcrypt::verify(&request.password, &password_hash)?;

            if !valid {
                return Err(AppError::Auth("Contraseña incorrecta".to_string()));
            }

            let token = uuid::Uuid::new_v4().to_string();
            Ok(LoginResponse { user, token })
        }
        None => Err(AppError::NotFound("Usuario no encontrado".to_string())),
    }
}

#[tauri::command]
pub fn get_current_user(db: State<Database>, user_id: i64) -> AppResult<User> {
    user_repo::find_by_id(&db, user_id)?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado".to_string()))
}
