use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Validation(String),
    NotFound(String),
    Conflict(String),
    Database(String),
    Auth(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Validation(message)
            | Self::NotFound(message)
            | Self::Conflict(message)
            | Self::Database(message)
            | Self::Auth(message) => write!(f, "{message}"),
        }
    }
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error.to_string())
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(error: bcrypt::BcryptError) -> Self {
        Self::Auth(error.to_string())
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(error: std::sync::PoisonError<T>) -> Self {
        Self::Database(format!("Database lock poisoned: {error}"))
    }
}

pub type AppResult<T> = Result<T, AppError>;
