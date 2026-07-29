use crate::models::setting::{CreateSettingRequest, Setting, UpdateSettingRequest};
use crate::shared::error::{AppError, AppResult};

pub struct StoredSettingImage {
    pub path: String,
    pub data_url: String,
}

pub trait SettingsRepository {
    fn find_all(&self) -> AppResult<Vec<Setting>>;
    fn find_by_key(&self, key: &str) -> AppResult<Option<Setting>>;
    fn update(&self, key: &str, value: Option<&str>) -> AppResult<Setting>;
    fn update_image_path(&self, key: &str, path: &str) -> AppResult<()>;
    fn create(&self, request: &CreateSettingRequest) -> AppResult<Setting>;
    fn delete(&self, key: &str) -> AppResult<()>;
}

pub trait SettingsImageStorage {
    fn store(&self, key: &str, source_path: &str) -> AppResult<StoredSettingImage>;
    fn read_data_url(&self, path: &str) -> AppResult<Option<String>>;
}

pub fn get_settings(repository: &impl SettingsRepository) -> AppResult<Vec<Setting>> {
    repository.find_all()
}

pub fn update_setting(
    repository: &impl SettingsRepository,
    request: UpdateSettingRequest,
) -> AppResult<Setting> {
    repository.update(&request.key, request.value.as_deref())
}

pub fn create_setting(
    repository: &impl SettingsRepository,
    request: CreateSettingRequest,
) -> AppResult<Setting> {
    ensure_development_mutation_allowed()?;
    if repository.find_by_key(&request.key)?.is_some() {
        return Err(AppError::Conflict(format!(
            "La clave '{}' ya existe",
            request.key
        )));
    }
    repository.create(&request)
}

pub fn delete_setting(repository: &impl SettingsRepository, key: String) -> AppResult<()> {
    ensure_development_mutation_allowed()?;
    repository.delete(&key)
}

pub fn save_setting_image(
    repository: &impl SettingsRepository,
    storage: &impl SettingsImageStorage,
    key: String,
    source_path: String,
) -> AppResult<String> {
    let image = storage.store(&key, &source_path)?;
    repository.update_image_path(&key, &image.path)?;
    Ok(image.data_url)
}

pub fn get_setting_image(
    repository: &impl SettingsRepository,
    storage: &impl SettingsImageStorage,
    key: String,
) -> AppResult<Option<String>> {
    let Some(path) = repository
        .find_by_key(&key)?
        .and_then(|setting| setting.value)
    else {
        return Ok(None);
    };
    if path.is_empty() {
        return Ok(None);
    }
    storage.read_data_url(&path)
}

fn ensure_development_mutation_allowed() -> AppResult<()> {
    if cfg!(debug_assertions) {
        Ok(())
    } else {
        Err(AppError::Auth(
            "Operación no permitida en producción".to_string(),
        ))
    }
}
