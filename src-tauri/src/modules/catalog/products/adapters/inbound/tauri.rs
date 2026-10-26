use crate::infrastructure::sqlite::Database;
use crate::models::product::{
    CreateProductRequest, ImagePreview, Product, UpdateProductRequest,
};
use crate::modules::catalog::products::{
    adapters::outbound::{
        filesystem::LocalProductImageStorage, sqlite::SqliteProductRepository,
    },
    application,
};
use crate::shared::error::{AppError, AppResult};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn get_products(db: State<Database>) -> AppResult<Vec<Product>> {
    application::get_products(&SqliteProductRepository::new(&db))
}

#[tauri::command]
pub fn get_active_products(db: State<Database>) -> AppResult<Vec<Product>> {
    application::get_active_products(&SqliteProductRepository::new(&db))
}

#[tauri::command]
pub fn get_product(db: State<Database>, id: i64) -> AppResult<Product> {
    application::get_product(&SqliteProductRepository::new(&db), id)
}

#[tauri::command]
pub fn find_product_by_barcode(db: State<Database>, barcode: String) -> AppResult<Product> {
    application::find_product_by_barcode(&SqliteProductRepository::new(&db), barcode)
}

#[tauri::command]
pub fn search_products(db: State<Database>, term: String) -> AppResult<Vec<Product>> {
    application::search_products(&SqliteProductRepository::new(&db), term)
}

#[tauri::command]
pub fn create_product(
    db: State<Database>,
    app_handle: AppHandle,
    request: CreateProductRequest,
) -> AppResult<Product> {
    let storage = image_storage(&app_handle)?;
    application::create_product(&SqliteProductRepository::new(&db), &storage, request)
}

#[tauri::command]
pub fn update_product(
    db: State<Database>,
    app_handle: AppHandle,
    request: UpdateProductRequest,
) -> AppResult<Product> {
    let storage = image_storage(&app_handle)?;
    application::update_product(&SqliteProductRepository::new(&db), &storage, request)
}

#[tauri::command]
pub fn delete_product(
    db: State<Database>,
    app_handle: AppHandle,
    id: i64,
) -> AppResult<()> {
    let storage = image_storage(&app_handle)?;
    application::delete_product(&SqliteProductRepository::new(&db), &storage, id)
}

#[tauri::command]
pub fn inspect_product_image(
    app_handle: AppHandle,
    source_path: String,
) -> AppResult<ImagePreview> {
    let storage = image_storage(&app_handle)?;
    application::inspect_product_image(&storage, source_path)
}

#[tauri::command]
pub fn get_product_images_dir(app_handle: AppHandle) -> AppResult<String> {
    let storage = image_storage(&app_handle)?;
    Ok(application::get_product_images_dir(&storage))
}

#[tauri::command]
pub fn read_product_image(
    app_handle: AppHandle,
    image_file: String,
) -> AppResult<Option<String>> {
    let storage = image_storage(&app_handle)?;
    application::read_product_image(&storage, image_file)
}

fn image_storage(app_handle: &AppHandle) -> AppResult<LocalProductImageStorage> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|error| {
        AppError::Database(format!(
            "No se pudo obtener el directorio de datos: {error}"
        ))
    })?;
    Ok(LocalProductImageStorage::new(app_data_dir))
}

#[cfg(test)]
mod tests {
    use crate::models::product::{
        CreateProductRequest, ImageChangeKind, ImagePreview, UpdateProductRequest,
    };

    /// BR3.2: el protocolo de archivos queda limitado a la carpeta de imágenes de la app.
    /// (No se puede levantar el alcance real de Tauri en pruebas: el ejecutable de prueba
    /// con la característica `test` no arranca en Windows.)
    #[test]
    fn tauri_conf_limits_the_asset_protocol_to_the_product_images_folder() {
        let conf: serde_json::Value =
            serde_json::from_str(include_str!("../../../../../../tauri.conf.json")).unwrap();
        let asset = &conf["app"]["security"]["assetProtocol"];

        assert_eq!(asset["enable"], true);
        let scope: Vec<&str> = asset["scope"]
            .as_array()
            .unwrap()
            .iter()
            .map(|value| value.as_str().unwrap())
            .collect();
        // `$APPDATA` ya resuelve a `app_data_dir` (incluye el identificador de la app):
        // repetirlo apunta a una carpeta inexistente y el protocolo responde 403.
        assert_eq!(scope, vec!["$APPDATA/product-images/**"]);
    }

    #[test]
    fn create_request_accepts_the_image_change_sent_by_the_frontend() {
        let request: CreateProductRequest = serde_json::from_str(
            r#"{"name":"A","price":1.0,"unit":"pieza","is_bulk":false,
                "image":{"kind":"replace","source_path":"C:\\fotos\\a.png"}}"#,
        )
        .unwrap();
        let image = request.image.unwrap();
        assert_eq!(image.kind, ImageChangeKind::Replace);
        assert_eq!(image.source_path.as_deref(), Some("C:\\fotos\\a.png"));
    }

    #[test]
    fn update_request_accepts_remove_and_rejects_unknown_kinds() {
        let request: UpdateProductRequest =
            serde_json::from_str(r#"{"id":3,"image":{"kind":"remove"}}"#).unwrap();
        assert_eq!(request.image.unwrap().kind, ImageChangeKind::Remove);

        let unknown = serde_json::from_str::<UpdateProductRequest>(
            r#"{"id":3,"image":{"kind":"borrar"}}"#,
        );
        assert!(unknown.is_err());
    }

    #[test]
    fn image_preview_serializes_with_the_fields_the_frontend_reads() {
        let preview = ImagePreview {
            format: "png".to_string(),
            size_bytes: 12,
            preview: "data:image/png;base64,AAAA".to_string(),
        };
        let value = serde_json::to_value(&preview).unwrap();
        assert_eq!(value["format"], "png");
        assert_eq!(value["size_bytes"], 12);
        assert_eq!(value["preview"], "data:image/png;base64,AAAA");
    }
}
