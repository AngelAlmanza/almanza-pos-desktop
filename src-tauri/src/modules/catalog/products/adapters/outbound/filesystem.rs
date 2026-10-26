use crate::models::product::ImagePreview;
use crate::modules::catalog::products::application::ProductImageStorage;
use crate::modules::catalog::products::image::{
    generate_file_name, is_valid_image_file_name, require_format, validate_extension,
    validate_size, ImageFormat,
};
use crate::modules::settings::adapters::outbound::filesystem::bytes_to_data_url;
use crate::shared::error::{AppError, AppResult};
use std::io::ErrorKind;
use std::path::PathBuf;

const IMAGES_FOLDER: &str = "product-images";

/// Copias de imágenes de producto bajo `<app_data_dir>/product-images`.
pub struct LocalProductImageStorage {
    images_dir: PathBuf,
}

impl LocalProductImageStorage {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            images_dir: app_data_dir.join(IMAGES_FOLDER),
        }
    }

    /// BR1.1-BR1.4. Abre el origen solo en lectura (BR2.5).
    fn read_source(&self, source_path: &str) -> AppResult<(Vec<u8>, ImageFormat)> {
        validate_extension(source_path)?;
        let metadata = std::fs::metadata(source_path).map_err(read_error)?;
        if !metadata.is_file() {
            return Err(AppError::Validation("No se encontró el archivo.".to_string()));
        }
        validate_size(metadata.len())?;
        let bytes = std::fs::read(source_path).map_err(read_error)?;
        validate_size(bytes.len() as u64)?;
        let format = require_format(&bytes)?;
        Ok((bytes, format))
    }
}

fn read_error(error: std::io::Error) -> AppError {
    match error.kind() {
        ErrorKind::NotFound => AppError::Validation("No se encontró el archivo.".to_string()),
        ErrorKind::PermissionDenied => {
            AppError::Validation("No hay permiso para leer el archivo.".to_string())
        }
        _ => AppError::Validation(format!("No se pudo leer el archivo: {error}")),
    }
}

fn save_error(error: impl std::fmt::Display) -> AppError {
    AppError::Database(format!("No se pudo guardar la imagen: {error}"))
}

impl ProductImageStorage for LocalProductImageStorage {
    fn inspect(&self, source_path: &str) -> AppResult<ImagePreview> {
        let (bytes, format) = self.read_source(source_path)?;
        Ok(ImagePreview {
            format: format.label().to_string(),
            size_bytes: bytes.len() as u64,
            preview: bytes_to_data_url(&bytes, format.extension()),
        })
    }

    fn store(&self, source_path: &str) -> AppResult<String> {
        let (bytes, format) = self.read_source(source_path)?;
        std::fs::create_dir_all(&self.images_dir).map_err(save_error)?;

        let file_name = generate_file_name(format);
        let final_path = self.images_dir.join(&file_name);
        // BR2.1: primero un temporal en la misma carpeta y luego se renombra.
        let temp_path = self.images_dir.join(format!("{file_name}.tmp"));
        std::fs::write(&temp_path, &bytes).map_err(|error| {
            let _ = std::fs::remove_file(&temp_path);
            save_error(error)
        })?;
        std::fs::rename(&temp_path, &final_path).map_err(|error| {
            let _ = std::fs::remove_file(&temp_path);
            save_error(error)
        })?;
        Ok(file_name)
    }

    fn delete(&self, file_name: &str) -> AppResult<()> {
        // BR2.6: solo se borra un nombre confinado a la carpeta de imágenes.
        if !is_valid_image_file_name(file_name) {
            eprintln!("Advertencia: se ignora la referencia de imagen no válida {file_name:?}");
            return Ok(());
        }
        match std::fs::remove_file(self.images_dir.join(file_name)) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
            Err(error) => Err(AppError::Database(format!(
                "No se pudo borrar la imagen {file_name}: {error}"
            ))),
        }
    }

    fn read_data_url(&self, file_name: &str) -> AppResult<Option<String>> {
        // BR2.6: solo se lee un nombre confinado a la carpeta de imágenes.
        if !is_valid_image_file_name(file_name) {
            return Ok(None);
        }
        let path = self.images_dir.join(file_name);
        let bytes = match std::fs::read(&path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
            Err(error) => {
                return Err(AppError::Database(format!(
                    "No se pudo leer la imagen {file_name}: {error}"
                )))
            }
        };
        validate_size(bytes.len() as u64)?;
        let format = require_format(&bytes)?;
        Ok(Some(bytes_to_data_url(&bytes, format.extension())))
    }

    fn directory(&self) -> PathBuf {
        self.images_dir.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    struct TempDir(PathBuf);

    impl TempDir {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("pos-product-images-{}", Uuid::new_v4()));
            std::fs::create_dir_all(&path).unwrap();
            Self(path)
        }

        fn write(&self, name: &str, bytes: &[u8]) -> String {
            let path = self.0.join(name);
            std::fs::write(&path, bytes).unwrap();
            path.to_string_lossy().to_string()
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn png_bytes() -> Vec<u8> {
        let mut bytes = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        bytes.extend_from_slice(b"fake-body");
        bytes
    }

    fn storage(root: &TempDir) -> LocalProductImageStorage {
        LocalProductImageStorage::new(root.0.join("app-data"))
    }

    #[test]
    fn store_copies_the_file_and_leaves_the_original_intact() {
        let root = TempDir::new();
        let original = png_bytes();
        let source = root.write("foto.png", &original);
        let storage = storage(&root);

        let name = storage.store(&source).unwrap();

        assert!(is_valid_image_file_name(&name));
        assert!(name.ends_with(".png"));
        assert_eq!(std::fs::read(storage.directory().join(&name)).unwrap(), original);
        assert_eq!(std::fs::read(&source).unwrap(), original);
        // No quedan temporales.
        let leftovers = std::fs::read_dir(storage.directory())
            .unwrap()
            .filter(|entry| {
                entry
                    .as_ref()
                    .unwrap()
                    .file_name()
                    .to_string_lossy()
                    .ends_with(".tmp")
            })
            .count();
        assert_eq!(leftovers, 0);
    }

    #[test]
    fn the_extension_follows_the_detected_signature_not_the_file_name() {
        let root = TempDir::new();
        let source = root.write("engañoso.jpg", &png_bytes());
        let name = storage(&root).store(&source).unwrap();
        assert!(name.ends_with(".png"), "{name}");
    }

    #[test]
    fn a_missing_source_is_rejected_with_a_clear_message() {
        let root = TempDir::new();
        let missing = root.0.join("no-existe.png").to_string_lossy().to_string();
        let error = storage(&root).inspect(&missing).unwrap_err().to_string();
        assert_eq!(error, "No se encontró el archivo.");
        assert!(!storage(&root).directory().exists());
    }

    #[test]
    fn an_empty_file_and_a_bad_signature_are_rejected() {
        let root = TempDir::new();
        let empty = root.write("vacio.png", &[]);
        let fake = root.write("falso.png", b"esto no es una imagen");
        let storage = storage(&root);
        assert_eq!(
            storage.inspect(&empty).unwrap_err().to_string(),
            "El archivo está vacío."
        );
        assert_eq!(
            storage.inspect(&fake).unwrap_err().to_string(),
            "El archivo no es una imagen PNG, JPG o WebP válida."
        );
        assert!(storage.store(&fake).is_err());
    }

    #[test]
    fn a_disallowed_extension_is_rejected_before_reading() {
        let root = TempDir::new();
        let source = root.write("animada.gif", b"GIF89a");
        let error = storage(&root).inspect(&source).unwrap_err().to_string();
        assert_eq!(error, "Formato no permitido. Usa PNG, JPG o WebP.");
    }

    #[test]
    fn inspect_returns_a_preview_without_writing_to_disk() {
        let root = TempDir::new();
        let source = root.write("foto.png", &png_bytes());
        let storage = storage(&root);

        let preview = storage.inspect(&source).unwrap();

        assert_eq!(preview.format, "png");
        assert_eq!(preview.size_bytes, png_bytes().len() as u64);
        assert!(preview.preview.starts_with("data:image/png;base64,"));
        assert!(!storage.directory().exists());
    }

    #[test]
    fn delete_removes_the_copy_and_ignores_missing_or_invalid_names() {
        let root = TempDir::new();
        let storage = storage(&root);
        let source = root.write("foto.png", &png_bytes());
        let name = storage.store(&source).unwrap();

        storage.delete(&name).unwrap();
        assert!(!storage.directory().join(&name).exists());
        // Archivo ausente: sin error.
        storage.delete(&name).unwrap();

        // Un nombre fuera de la carpeta nunca se toca (BR2.6).
        let outside = root.write("secreto.png", &png_bytes());
        storage.delete("../../secreto.png").unwrap();
        storage.delete(&outside).unwrap();
        assert!(std::path::Path::new(&outside).exists());
    }

    #[test]
    fn read_data_url_returns_the_stored_copy_and_none_when_missing() {
        let root = TempDir::new();
        let storage = storage(&root);
        let name = storage.store(&root.write("foto.png", &png_bytes())).unwrap();

        let url = storage.read_data_url(&name).unwrap().unwrap();
        assert!(url.starts_with("data:image/png;base64,"));

        storage.delete(&name).unwrap();
        assert!(storage.read_data_url(&name).unwrap().is_none());
    }

    #[test]
    fn read_data_url_ignores_names_outside_the_folder() {
        let root = TempDir::new();
        let storage = storage(&root);
        root.write("secreto.png", &png_bytes());
        assert!(storage.read_data_url("../secreto.png").unwrap().is_none());
        assert!(storage.read_data_url("secreto.png").unwrap().is_none());
    }

    #[test]
    fn the_folder_is_created_on_first_store() {
        let root = TempDir::new();
        let storage = storage(&root);
        assert!(!storage.directory().exists());
        storage.store(&root.write("foto.webp", b"RIFF\x04\x00\x00\x00WEBPxx")).unwrap();
        assert!(storage.directory().is_dir());
    }
}
