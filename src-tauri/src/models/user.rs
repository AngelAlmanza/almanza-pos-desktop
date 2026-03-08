use serde::{Deserialize, Serialize};

/// Strongly-typed representation of the two supported user roles.
/// The `role` column in the `users` table stores the lowercase string form.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Cashier,
}

impl UserRole {
    /// Returns the canonical string stored in the database.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Admin => "admin",
            Self::Cashier => "cashier",
        }
    }

    /// Parses the string values written by the database. Returns `None` for
    /// any unrecognised value so callers can produce a typed error.
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "admin" => Some(Self::Admin),
            "cashier" => Some(Self::Cashier),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for UserRole {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = String::column_result(value)?;
        UserRole::parse(&s).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(format!("invalid user role: {}", s).into())
        })
    }
}

impl rusqlite::types::ToSql for UserRole {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(
            self.as_str().to_string(),
        )))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub role: UserRole,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub id: i64,
    pub username: Option<String>,
    pub password: Option<String>,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoginResponse {
    pub user: User,
    pub token: String,
}
