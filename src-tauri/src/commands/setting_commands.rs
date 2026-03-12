use crate::db::repository::setting_repo;
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::setting::{CreateSettingRequest, Setting, UpdateSettingRequest};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn get_settings(db: State<Database>) -> AppResult<Vec<Setting>> {
    setting_repo::find_all(&db)
}

#[tauri::command]
pub fn update_setting(db: State<Database>, request: UpdateSettingRequest) -> AppResult<Setting> {
    setting_repo::update(&db, &request.key, request.value.as_deref())
}

#[tauri::command]
pub fn create_setting(db: State<Database>, request: CreateSettingRequest) -> AppResult<Setting> {
    if !cfg!(debug_assertions) {
        return Err(AppError::Auth(
            "Operación no permitida en producción".to_string(),
        ));
    }

    if setting_repo::find_by_key(&db, &request.key)?.is_some() {
        return Err(AppError::Conflict(format!(
            "La clave '{}' ya existe",
            request.key
        )));
    }

    setting_repo::create(&db, &request)
}

#[tauri::command]
pub fn delete_setting(db: State<Database>, key: String) -> AppResult<()> {
    if !cfg!(debug_assertions) {
        return Err(AppError::Auth(
            "Operación no permitida en producción".to_string(),
        ));
    }

    setting_repo::delete(&db, &key)
}

/// Copies `src_path` into `<app_data_dir>/resources/<key>.<ext>`, stores the
/// destination path in the DB, and returns the image as a base64 data-URL so
/// the frontend can display it immediately without needing the asset protocol.
#[tauri::command]
pub fn save_setting_image(
    db: State<Database>,
    app_handle: AppHandle,
    key: String,
    src_path: String,
) -> AppResult<String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Database(format!("No se pudo obtener el directorio de datos: {}", e)))?;

    let resources_dir = app_data_dir.join("resources");
    std::fs::create_dir_all(&resources_dir).map_err(|e| {
        AppError::Database(format!("No se pudo crear el directorio resources: {}", e))
    })?;

    let src = PathBuf::from(&src_path);
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let dest = resources_dir.join(format!("{}.{}", key, ext));

    std::fs::copy(&src_path, &dest)
        .map_err(|e| AppError::Database(format!("No se pudo copiar el archivo: {}", e)))?;

    let dest_str = dest.to_string_lossy().to_string();
    setting_repo::update_path(&db, &key, &dest_str)?;

    let bytes = std::fs::read(&dest)
        .map_err(|e| AppError::Database(format!("No se pudo leer el archivo: {}", e)))?;

    Ok(bytes_to_data_url(&bytes, &ext))
}

/// Reads the stored image for `key` and returns it as a base64 data-URL,
/// or `null` if no image has been set or the file no longer exists.
#[tauri::command]
pub fn get_setting_image(db: State<Database>, key: String) -> AppResult<Option<String>> {
    let path = match setting_repo::find_by_key(&db, &key)?
        .and_then(|s| s.value)
        .filter(|v| !v.is_empty())
    {
        Some(p) => p,
        None => return Ok(None),
    };

    if !std::path::Path::new(&path).exists() {
        return Ok(None);
    }

    let bytes = std::fs::read(&path)
        .map_err(|e| AppError::Database(format!("No se pudo leer la imagen: {}", e)))?;

    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    Ok(Some(bytes_to_data_url(&bytes, &ext)))
}

fn bytes_to_data_url(bytes: &[u8], ext: &str) -> String {
    let mime = match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };
    format!("data:{};base64,{}", mime, encode_base64(bytes))
}

fn encode_base64(input: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((input.len() + 2) / 3 * 4);

    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;

        out.push(TABLE[((n >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((n >> 12) & 0x3F) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((n >> 6) & 0x3F) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(n & 0x3F) as usize] as char
        } else {
            '='
        });
    }

    out
}
