use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub price: f64,
    pub unit: String,
    pub is_bulk: bool,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub stock: f64,
    pub min_stock: f64,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
    /// Nombre de la copia en la carpeta de imágenes; `None` = sin imagen.
    pub image_file: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageChangeKind {
    #[default]
    Keep,
    Replace,
    Remove,
}

/// Cambio de imagen pedido junto con una creación o actualización (BR5.1).
#[derive(Debug, Clone, PartialEq, Default, Deserialize)]
pub struct ImageChange {
    #[serde(default)]
    pub kind: ImageChangeKind,
    pub source_path: Option<String>,
}

/// Resultado de inspeccionar un archivo de origen (BR1.1-BR1.4).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ImagePreview {
    pub format: String,
    pub size_bytes: u64,
    pub preview: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub price: f64,
    pub unit: String,
    #[serde(default)]
    pub is_bulk: bool,
    pub category_id: Option<i64>,
    pub stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub image: Option<ImageChange>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub id: i64,
    pub name: Option<String>,
    pub description: Option<String>,
    pub barcode: Option<String>,
    pub price: Option<f64>,
    pub unit: Option<String>,
    pub is_bulk: Option<bool>,
    pub category_id: Option<i64>,
    pub min_stock: Option<f64>,
    pub active: Option<bool>,
    pub image: Option<ImageChange>,
}

#[cfg(test)]
mod tests {
    use super::{CreateProductRequest, ImageChange, ImageChangeKind, UpdateProductRequest};

    #[test]
    fn image_change_without_kind_defaults_to_keep() {
        let change: ImageChange = serde_json::from_str("{}").unwrap();
        assert_eq!(change.kind, ImageChangeKind::Keep);
        assert!(change.source_path.is_none());
    }

    #[test]
    fn image_change_replace_carries_the_source_path() {
        let change: ImageChange =
            serde_json::from_str(r#"{"kind":"replace","source_path":"C:\\a\\b.png"}"#).unwrap();
        assert_eq!(change.kind, ImageChangeKind::Replace);
        assert_eq!(change.source_path.as_deref(), Some("C:\\a\\b.png"));
    }

    #[test]
    fn image_change_remove_is_deserialized() {
        let change: ImageChange = serde_json::from_str(r#"{"kind":"remove"}"#).unwrap();
        assert_eq!(change.kind, ImageChangeKind::Remove);
    }

    #[test]
    fn requests_without_image_field_still_deserialize() {
        let create: CreateProductRequest =
            serde_json::from_str(r#"{"name":"A","price":1.0,"unit":"pieza"}"#).unwrap();
        assert!(create.image.is_none());
        let update: UpdateProductRequest = serde_json::from_str(r#"{"id":1}"#).unwrap();
        assert!(update.image.is_none());
    }
}
