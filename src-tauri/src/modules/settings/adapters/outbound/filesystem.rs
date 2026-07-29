use crate::modules::settings::application::{SettingsImageStorage, StoredSettingImage};
use crate::shared::error::{AppError, AppResult};
use std::path::{Path, PathBuf};

pub struct LocalSettingsImageStorage {
    resources_dir: PathBuf,
}

impl LocalSettingsImageStorage {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            resources_dir: app_data_dir.join("resources"),
        }
    }
}

impl SettingsImageStorage for LocalSettingsImageStorage {
    fn store(&self, key: &str, source_path: &str) -> AppResult<StoredSettingImage> {
        std::fs::create_dir_all(&self.resources_dir).map_err(|error| {
            AppError::Database(format!("No se pudo crear el directorio resources: {error}"))
        })?;
        let extension = Path::new(source_path)
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("png")
            .to_lowercase();
        let destination = self.resources_dir.join(format!("{key}.{extension}"));
        std::fs::copy(source_path, &destination).map_err(|error| {
            AppError::Database(format!("No se pudo copiar el archivo: {error}"))
        })?;
        let bytes = std::fs::read(&destination)
            .map_err(|error| AppError::Database(format!("No se pudo leer el archivo: {error}")))?;
        Ok(StoredSettingImage {
            path: destination.to_string_lossy().to_string(),
            data_url: bytes_to_data_url(&bytes, &extension),
        })
    }

    fn read_data_url(&self, path: &str) -> AppResult<Option<String>> {
        let path = Path::new(path);
        if !path.exists() {
            return Ok(None);
        }
        let bytes = std::fs::read(path)
            .map_err(|error| AppError::Database(format!("No se pudo leer la imagen: {error}")))?;
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("png");
        Ok(Some(bytes_to_data_url(&bytes, extension)))
    }
}

fn bytes_to_data_url(bytes: &[u8], extension: &str) -> String {
    let mime = match extension.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };
    format!("data:{mime};base64,{}", encode_base64(bytes))
}

fn encode_base64(input: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let value = (b0 << 16) | (b1 << 8) | b2;
        output.push(TABLE[((value >> 18) & 0x3F) as usize] as char);
        output.push(TABLE[((value >> 12) & 0x3F) as usize] as char);
        output.push(if chunk.len() > 1 {
            TABLE[((value >> 6) & 0x3F) as usize] as char
        } else {
            '='
        });
        output.push(if chunk.len() > 2 {
            TABLE[(value & 0x3F) as usize] as char
        } else {
            '='
        });
    }
    output
}
