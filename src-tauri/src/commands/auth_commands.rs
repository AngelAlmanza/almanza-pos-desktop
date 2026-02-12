use crate::db::Database;
use crate::db::repository::user_repo;
use crate::models::user::{LoginRequest, LoginResponse, User};
use tauri::State;

#[tauri::command]
pub fn login(db: State<Database>, request: LoginRequest) -> Result<LoginResponse, String> {
    let result = user_repo::find_by_username(&db, &request.username)?;

    match result {
        Some((user, password_hash)) => {
            if !user.active {
                return Err("Usuario desactivado".to_string());
            }

            let valid = bcrypt::verify(&request.password, &password_hash)
                .map_err(|e| e.to_string())?;

            if !valid {
                return Err("Contraseña incorrecta".to_string());
            }

            // Generate a simple session token
            let token = uuid::Uuid::new_v4().to_string();

            Ok(LoginResponse { user, token })
        }
        None => Err("Usuario no encontrado".to_string()),
    }
}

#[tauri::command]
pub fn get_current_user(db: State<Database>, user_id: i64) -> Result<User, String> {
    user_repo::find_by_id(&db, user_id)?
        .ok_or_else(|| "Usuario no encontrado".to_string())
}
