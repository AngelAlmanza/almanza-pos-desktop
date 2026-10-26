//! Reglas puras de la imagen de producto (BR1.1-BR1.3, BR2.6). Sin acceso a disco.

use crate::shared::error::{AppError, AppResult};
use std::path::Path;
use uuid::Uuid;

/// 5 MiB (BR1.3).
pub const MAX_IMAGE_BYTES: u64 = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS: [&str; 4] = ["png", "jpg", "jpeg", "webp"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageFormat {
    Png,
    Jpeg,
    Webp,
}

impl ImageFormat {
    /// Extensión con la que se guarda la copia (jpeg -> jpg).
    pub fn extension(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Webp => "webp",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpeg",
            Self::Webp => "webp",
        }
    }
}

/// BR1.1: la extensión (sin distinguir mayúsculas) debe ser png, jpg, jpeg o webp.
pub fn validate_extension(path: &str) -> AppResult<()> {
    let allowed = Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .is_some_and(|value| ALLOWED_EXTENSIONS.contains(&value.as_str()));
    if allowed {
        Ok(())
    } else {
        Err(AppError::Validation(
            "Formato no permitido. Usa PNG, JPG o WebP.".to_string(),
        ))
    }
}

/// BR1.3: entre 1 byte y 5 MiB.
pub fn validate_size(size_bytes: u64) -> AppResult<()> {
    if size_bytes == 0 {
        return Err(AppError::Validation("El archivo está vacío.".to_string()));
    }
    if size_bytes > MAX_IMAGE_BYTES {
        let megabytes = size_bytes as f64 / (1024.0 * 1024.0);
        return Err(AppError::Validation(format!(
            "La imagen pesa {megabytes:.1} MB. El máximo es 5 MB."
        )));
    }
    Ok(())
}

/// BR1.2: formato detectado por la firma (primeros bytes).
pub fn detect_format(bytes: &[u8]) -> Option<ImageFormat> {
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return Some(ImageFormat::Png);
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some(ImageFormat::Jpeg);
    }
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return Some(ImageFormat::Webp);
    }
    None
}

pub fn require_format(bytes: &[u8]) -> AppResult<ImageFormat> {
    detect_format(bytes).ok_or_else(|| {
        AppError::Validation("El archivo no es una imagen PNG, JPG o WebP válida.".to_string())
    })
}

/// Nombre de la copia: `<uuid-v4>.<ext>` (BR2.1).
pub fn generate_file_name(format: ImageFormat) -> String {
    format!("{}.{}", Uuid::new_v4().hyphenated(), format.extension())
}

/// BR2.6: solo se aceptan nombres `<uuid-v4>.(png|jpg|webp)`. Cualquier otra
/// cosa (separadores, `..`, `:`, rutas absolutas) se trata como "sin imagen".
pub fn is_valid_image_file_name(name: &str) -> bool {
    let Some((stem, extension)) = name.split_once('.') else {
        return false;
    };
    if !matches!(extension, "png" | "jpg" | "webp") || stem.len() != 36 {
        return false;
    }
    match Uuid::parse_str(stem) {
        Ok(uuid) => {
            uuid.get_version_num() == 4 && uuid.hyphenated().to_string() == stem
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PNG: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    #[test]
    fn detects_png_jpeg_and_webp_signatures() {
        assert_eq!(detect_format(&PNG), Some(ImageFormat::Png));
        assert_eq!(detect_format(&[0xFF, 0xD8, 0xFF, 0xE0]), Some(ImageFormat::Jpeg));
        assert_eq!(
            detect_format(b"RIFF\x10\x00\x00\x00WEBPVP8 "),
            Some(ImageFormat::Webp)
        );
    }

    #[test]
    fn rejects_unknown_or_truncated_signatures() {
        assert_eq!(detect_format(b"GIF89a"), None);
        assert_eq!(detect_format(b"RIFF\x00\x00\x00\x00WAVE"), None);
        assert_eq!(detect_format(&PNG[..4]), None);
        assert_eq!(detect_format(&[]), None);
        assert!(require_format(b"hello").is_err());
    }

    #[test]
    fn extension_is_case_insensitive_and_restricted() {
        for path in ["a.png", "a.JPG", "a.jpeg", "C:\\x\\A.WebP"] {
            assert!(validate_extension(path).is_ok(), "{path}");
        }
        for path in ["a.gif", "a.svg", "a", "a.png.exe"] {
            let error = validate_extension(path).unwrap_err().to_string();
            assert_eq!(error, "Formato no permitido. Usa PNG, JPG o WebP.", "{path}");
        }
    }

    #[test]
    fn size_limits_are_zero_max_and_over_max() {
        assert_eq!(
            validate_size(0).unwrap_err().to_string(),
            "El archivo está vacío."
        );
        assert!(validate_size(1).is_ok());
        assert!(validate_size(5_242_880).is_ok());
        let error = validate_size(5_242_881).unwrap_err().to_string();
        assert_eq!(error, "La imagen pesa 5.0 MB. El máximo es 5 MB.");
        assert!(validate_size(7 * 1024 * 1024)
            .unwrap_err()
            .to_string()
            .contains("7.0 MB"));
    }

    #[test]
    fn generated_names_follow_uuid_and_format_extension() {
        let png = generate_file_name(ImageFormat::Png);
        let jpeg = generate_file_name(ImageFormat::Jpeg);
        let webp = generate_file_name(ImageFormat::Webp);
        assert!(png.ends_with(".png") && jpeg.ends_with(".jpg") && webp.ends_with(".webp"));
        for name in [&png, &jpeg, &webp] {
            assert!(is_valid_image_file_name(name), "{name}");
        }
        assert_ne!(generate_file_name(ImageFormat::Png), png);
    }

    #[test]
    fn file_names_are_confined_to_the_images_folder() {
        let uuid = "123e4567-e89b-42d3-a456-426614174000";
        assert!(is_valid_image_file_name(&format!("{uuid}.png")));
        for name in [
            "../x.png".to_string(),
            "C:\\Windows\\x.png".to_string(),
            "/etc/passwd".to_string(),
            format!("sub/{uuid}.png"),
            format!("sub\\{uuid}.png"),
            format!("..{uuid}.png"),
            format!("{uuid}.png:stream"),
            format!("{uuid}.gif"),
            format!("{uuid}.PNG"),
            format!("{uuid}"),
            String::new(),
        ] {
            assert!(!is_valid_image_file_name(&name), "{name}");
        }
    }

    #[test]
    fn file_names_require_a_version_4_uuid() {
        // versión 1 (tercer grupo empieza con 1)
        assert!(!is_valid_image_file_name(
            "123e4567-e89b-12d3-a456-426614174000.png"
        ));
        assert!(!is_valid_image_file_name("not-a-uuid-at-all-xxxxxxxxxxxxxxxxxxxxx.png"));
        // mayúsculas no son el formato generado
        assert!(!is_valid_image_file_name(
            "123E4567-E89B-42D3-A456-426614174000.png"
        ));
    }

    #[test]
    fn jpeg_is_stored_with_the_jpg_extension() {
        assert_eq!(ImageFormat::Jpeg.extension(), "jpg");
        assert_eq!(ImageFormat::Jpeg.label(), "jpeg");
    }
}
