use crate::db::repository::user_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::user::{CreateUserRequest, UpdateUserRequest, User, UserRole};
use tauri::State;

#[tauri::command]
pub fn get_users(db: State<Database>) -> AppResult<Vec<User>> {
    user_repo::find_all(&db)
}

#[tauri::command]
pub fn get_user(db: State<Database>, id: i64) -> AppResult<User> {
    user_repo::find_by_id(&db, id)?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado".to_string()))
}

#[tauri::command]
pub fn create_user(db: State<Database>, request: CreateUserRequest) -> AppResult<User> {
    let role = UserRole::parse(&request.role).ok_or_else(|| {
        AppError::Validation("Rol inválido. Debe ser 'admin' o 'cashier'".to_string())
    })?;

    if user_repo::find_by_username(&db, &request.username)?.is_some() {
        return Err(AppError::Conflict(format!(
            "El usuario {} ya existe",
            request.username
        )));
    }

    let password_hash = bcrypt::hash(&request.password, bcrypt::DEFAULT_COST)?;

    user_repo::create(&db, &request.username, &password_hash, &request.full_name, role)
}

#[tauri::command]
pub fn update_user(db: State<Database>, request: UpdateUserRequest) -> AppResult<User> {
    let role = match &request.role {
        Some(r) => Some(UserRole::parse(r).ok_or_else(|| {
            AppError::Validation("Rol inválido. Debe ser 'admin' o 'cashier'".to_string())
        })?),
        None => None,
    };

    if let Some(ref username) = request.username {
        let existing = user_repo::find_by_username(&db, username)?;
        if existing.is_some() && existing.unwrap().0.id != request.id {
            return Err(AppError::Conflict(format!(
                "El usuario {} ya existe",
                username
            )));
        }
    }

    let password_hash = match &request.password {
        Some(pwd) => Some(bcrypt::hash(pwd, bcrypt::DEFAULT_COST)?),
        None => None,
    };

    user_repo::update(
        &db,
        request.id,
        request.username.as_deref(),
        password_hash.as_deref(),
        request.full_name.as_deref(),
        role,
        request.active,
    )
}

#[tauri::command]
pub fn delete_user(db: State<Database>, id: i64) -> AppResult<()> {
    user_repo::delete(&db, id)
}
