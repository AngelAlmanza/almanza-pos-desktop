use crate::db::Database;
use crate::db::repository::user_repo;
use crate::models::user::{CreateUserRequest, UpdateUserRequest, User};
use tauri::State;

#[tauri::command]
pub fn get_users(db: State<Database>) -> Result<Vec<User>, String> {
    user_repo::find_all(&db)
}

#[tauri::command]
pub fn get_user(db: State<Database>, id: i64) -> Result<User, String> {
    user_repo::find_by_id(&db, id)?.ok_or_else(|| "Usuario no encontrado".to_string())
}

#[tauri::command]
pub fn create_user(db: State<Database>, request: CreateUserRequest) -> Result<User, String> {
    if request.role != "admin" && request.role != "cashier" {
        return Err("Rol inválido. Debe ser 'admin' o 'cashier'".to_string());
    }

    let password_hash = bcrypt::hash(&request.password, bcrypt::DEFAULT_COST)
        .map_err(|e| e.to_string())?;

    user_repo::create(&db, &request.username, &password_hash, &request.full_name, &request.role)
}

#[tauri::command]
pub fn update_user(db: State<Database>, request: UpdateUserRequest) -> Result<User, String> {
    if let Some(ref role) = request.role {
        if role != "admin" && role != "cashier" {
            return Err("Rol inválido. Debe ser 'admin' o 'cashier'".to_string());
        }
    }

    let password_hash = match &request.password {
        Some(pwd) => Some(bcrypt::hash(pwd, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?),
        None => None,
    };

    user_repo::update(
        &db,
        request.id,
        request.username.as_deref(),
        password_hash.as_deref(),
        request.full_name.as_deref(),
        request.role.as_deref(),
        request.active,
    )
}

#[tauri::command]
pub fn delete_user(db: State<Database>, id: i64) -> Result<(), String> {
    user_repo::delete(&db, id)
}
