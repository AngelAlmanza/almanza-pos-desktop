use crate::models::user::{
    CreateUserRequest, LoginRequest, LoginResponse, UpdateUserRequest, User, UserRole,
};
use crate::shared::error::{AppError, AppResult};

pub struct UserCredentials {
    pub user: User,
    pub password_hash: String,
}

pub trait UserRepository {
    fn find_all(&self) -> AppResult<Vec<User>>;
    fn find_by_id(&self, id: i64) -> AppResult<Option<User>>;
    fn find_by_username(&self, username: &str) -> AppResult<Option<UserCredentials>>;
    fn create(
        &self,
        username: &str,
        password_hash: &str,
        full_name: &str,
        role: UserRole,
    ) -> AppResult<User>;
    fn update(
        &self,
        id: i64,
        username: Option<&str>,
        password_hash: Option<&str>,
        full_name: Option<&str>,
        role: Option<UserRole>,
        active: Option<bool>,
    ) -> AppResult<User>;
    fn delete(&self, id: i64) -> AppResult<()>;
}

pub fn login(repository: &impl UserRepository, request: LoginRequest) -> AppResult<LoginResponse> {
    let credentials = repository
        .find_by_username(&request.username)?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado".to_string()))?;
    if !credentials.user.active {
        return Err(AppError::Auth("Usuario desactivado".to_string()));
    }
    if !bcrypt::verify(&request.password, &credentials.password_hash)? {
        return Err(AppError::Auth("Contraseña incorrecta".to_string()));
    }
    Ok(LoginResponse {
        user: credentials.user,
        token: uuid::Uuid::new_v4().to_string(),
    })
}

pub fn get_current_user(repository: &impl UserRepository, user_id: i64) -> AppResult<User> {
    get_user(repository, user_id)
}

pub fn get_users(repository: &impl UserRepository) -> AppResult<Vec<User>> {
    repository.find_all()
}

pub fn get_user(repository: &impl UserRepository, id: i64) -> AppResult<User> {
    repository
        .find_by_id(id)?
        .ok_or_else(|| AppError::NotFound("Usuario no encontrado".to_string()))
}

pub fn create_user(
    repository: &impl UserRepository,
    request: CreateUserRequest,
) -> AppResult<User> {
    let role = parse_role(&request.role)?;
    if repository.find_by_username(&request.username)?.is_some() {
        return Err(AppError::Conflict(format!(
            "El usuario {} ya existe",
            request.username
        )));
    }
    let password_hash = bcrypt::hash(&request.password, bcrypt::DEFAULT_COST)?;
    repository.create(&request.username, &password_hash, &request.full_name, role)
}

pub fn update_user(
    repository: &impl UserRepository,
    request: UpdateUserRequest,
) -> AppResult<User> {
    let role = request.role.as_deref().map(parse_role).transpose()?;
    if let Some(username) = request.username.as_deref() {
        if let Some(existing) = repository.find_by_username(username)? {
            if existing.user.id != request.id {
                return Err(AppError::Conflict(format!(
                    "El usuario {username} ya existe"
                )));
            }
        }
    }
    let password_hash = request
        .password
        .as_deref()
        .map(|password| bcrypt::hash(password, bcrypt::DEFAULT_COST))
        .transpose()?;
    repository.update(
        request.id,
        request.username.as_deref(),
        password_hash.as_deref(),
        request.full_name.as_deref(),
        role,
        request.active,
    )
}

pub fn delete_user(repository: &impl UserRepository, id: i64) -> AppResult<()> {
    repository.delete(id)
}

fn parse_role(value: &str) -> AppResult<UserRole> {
    UserRole::parse(value).ok_or_else(|| {
        AppError::Validation("Rol inválido. Debe ser 'admin' o 'cashier'".to_string())
    })
}
