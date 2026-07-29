use crate::infrastructure::sqlite::Database;
use crate::models::setting::{CreateSettingRequest, Setting, UpdateSettingRequest};
use crate::modules::settings::adapters::outbound::{
    filesystem::LocalSettingsImageStorage, sqlite::SqliteSettingsRepository,
};
use crate::modules::settings::application;
use crate::shared::error::{AppError, AppResult};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn get_settings(db: State<Database>) -> AppResult<Vec<Setting>> {
    application::get_settings(&SqliteSettingsRepository::new(&db))
}

#[tauri::command]
pub fn update_setting(db: State<Database>, request: UpdateSettingRequest) -> AppResult<Setting> {
    application::update_setting(&SqliteSettingsRepository::new(&db), request)
}

#[tauri::command]
pub fn create_setting(db: State<Database>, request: CreateSettingRequest) -> AppResult<Setting> {
    application::create_setting(&SqliteSettingsRepository::new(&db), request)
}

#[tauri::command]
pub fn delete_setting(db: State<Database>, key: String) -> AppResult<()> {
    application::delete_setting(&SqliteSettingsRepository::new(&db), key)
}

#[tauri::command]
pub fn save_setting_image(
    db: State<Database>,
    app_handle: AppHandle,
    key: String,
    src_path: String,
) -> AppResult<String> {
    let storage = image_storage(&app_handle)?;
    application::save_setting_image(&SqliteSettingsRepository::new(&db), &storage, key, src_path)
}

#[tauri::command]
pub fn get_setting_image(
    db: State<Database>,
    app_handle: AppHandle,
    key: String,
) -> AppResult<Option<String>> {
    let storage = image_storage(&app_handle)?;
    application::get_setting_image(&SqliteSettingsRepository::new(&db), &storage, key)
}

fn image_storage(app_handle: &AppHandle) -> AppResult<LocalSettingsImageStorage> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|error| {
        AppError::Database(format!(
            "No se pudo obtener el directorio de datos: {error}"
        ))
    })?;
    Ok(LocalSettingsImageStorage::new(app_data_dir))
}
