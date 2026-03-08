use std::fmt;

/// Typed application errors. Every fallible operation in commands and
/// repositories returns `AppResult<T>` so callers can distinguish between
/// validation failures, missing records, conflicts and infrastructure errors.
#[derive(Debug)]
pub enum AppError {
    /// Input failed business-rule validation (negative price, empty name, etc.)
    Validation(String),
    /// The requested record does not exist.
    NotFound(String),
    /// The operation would violate a uniqueness or state constraint.
    Conflict(String),
    /// A database or I/O error occurred.
    Database(String),
    /// Authentication or authorisation failure.
    Auth(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Validation(msg)
            | Self::NotFound(msg)
            | Self::Conflict(msg)
            | Self::Database(msg)
            | Self::Auth(msg) => write!(f, "{}", msg),
        }
    }
}

/// Tauri requires the error type of a command to implement `Serialize`.
/// We serialise every variant as its human-readable message string so the
/// frontend receives a plain error string (same shape as before).
impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e.to_string())
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(e: bcrypt::BcryptError) -> Self {
        Self::Auth(e.to_string())
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(e: std::sync::PoisonError<T>) -> Self {
        Self::Database(format!("Database lock poisoned: {}", e))
    }
}

/// Convenience alias used throughout the codebase.
pub type AppResult<T> = Result<T, AppError>;
