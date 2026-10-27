use crate::models::product::{
    CreateProductRequest, ImageChange, ImageChangeKind, ImagePreview, Product,
    UpdateProductRequest,
};
use crate::modules::catalog::products::image::is_valid_image_file_name;
use crate::modules::catalog::products::matching;
use crate::shared::error::{AppError, AppResult};
use std::path::PathBuf;

const BULK_UNITS: [&str; 3] = ["kg", "litro", "metro"];

/// Qué hacer con la columna `image_file` al actualizar un producto.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImageFileUpdate {
    Keep,
    Set(String),
    Clear,
}

pub trait ProductRepository {
    fn find_all(&self) -> AppResult<Vec<Product>>;
    fn find_active(&self) -> AppResult<Vec<Product>>;
    fn find_by_id(&self, id: i64) -> AppResult<Option<Product>>;
    fn find_by_barcode(&self, barcode: &str) -> AppResult<Option<Product>>;
    fn search(&self, term: &str) -> AppResult<Vec<Product>>;
    fn create(
        &self,
        request: &CreateProductRequest,
        image_file: Option<&str>,
    ) -> AppResult<Product>;
    fn update(
        &self,
        request: &UpdateProductRequest,
        image: ImageFileUpdate,
    ) -> AppResult<Product>;
    fn delete(&self, id: i64) -> AppResult<()>;
}

/// Puerto de almacenamiento de las copias de imagen (BR2.x).
pub trait ProductImageStorage {
    /// Valida el origen (solo lectura) y devuelve su vista previa (BR1.x).
    fn inspect(&self, source_path: &str) -> AppResult<ImagePreview>;
    /// Valida de nuevo, copia a la carpeta y devuelve el nombre de la copia (BR2.1).
    fn store(&self, source_path: &str) -> AppResult<String>;
    /// Borra una copia. Un nombre inválido se ignora (BR2.6).
    fn delete(&self, file_name: &str) -> AppResult<()>;
    /// Lee una copia como data URL; `None` si ya no existe (FR4.12).
    fn read_data_url(&self, file_name: &str) -> AppResult<Option<String>>;
    fn directory(&self) -> PathBuf;
}

/// Cambio de imagen ya interpretado (BR5.1).
#[derive(Debug, PartialEq, Eq)]
enum ResolvedImageChange {
    Keep,
    Replace(String),
    Remove,
}

fn invalid_image_change() -> AppError {
    AppError::Validation("Cambio de imagen no válido.".to_string())
}

fn resolve_image_change(
    change: Option<&ImageChange>,
    allow_remove: bool,
) -> AppResult<ResolvedImageChange> {
    let Some(change) = change else {
        return Ok(ResolvedImageChange::Keep);
    };
    let source = change.source_path.as_deref();
    match change.kind {
        ImageChangeKind::Keep if source.is_none() => Ok(ResolvedImageChange::Keep),
        ImageChangeKind::Remove if source.is_none() && allow_remove => {
            Ok(ResolvedImageChange::Remove)
        }
        ImageChangeKind::Replace => match source {
            Some(path) if !path.trim().is_empty() => {
                Ok(ResolvedImageChange::Replace(path.to_string()))
            }
            _ => Err(invalid_image_change()),
        },
        _ => Err(invalid_image_change()),
    }
}

/// BR2.7: una copia que no se puede borrar solo deja una advertencia.
fn discard_copy(storage: &impl ProductImageStorage, file_name: &str) {
    if let Err(error) = storage.delete(file_name) {
        eprintln!("Advertencia: no se pudo borrar la imagen {file_name}: {error}");
    }
}

pub fn inspect_product_image(
    storage: &impl ProductImageStorage,
    source_path: String,
) -> AppResult<ImagePreview> {
    storage.inspect(&source_path)
}

/// Respaldo cuando la pantalla no puede abrir la copia por el protocolo de archivos.
/// BR2.6: un nombre que no sea `<uuid-v4>.<ext>` se trata como "sin imagen".
pub fn read_product_image(
    storage: &impl ProductImageStorage,
    image_file: String,
) -> AppResult<Option<String>> {
    if !is_valid_image_file_name(&image_file) {
        eprintln!("Advertencia: se ignora la referencia de imagen no válida {image_file:?}");
        return Ok(None);
    }
    storage.read_data_url(&image_file)
}

pub fn get_product_images_dir(storage: &impl ProductImageStorage) -> String {
    storage.directory().to_string_lossy().to_string()
}

pub fn get_products(repository: &impl ProductRepository) -> AppResult<Vec<Product>> {
    repository.find_all()
}

pub fn get_active_products(repository: &impl ProductRepository) -> AppResult<Vec<Product>> {
    repository.find_active()
}

pub fn get_product(repository: &impl ProductRepository, id: i64) -> AppResult<Product> {
    repository
        .find_by_id(id)?
        .ok_or_else(|| AppError::NotFound("Producto no encontrado".to_string()))
}

pub fn find_product_by_barcode(
    repository: &impl ProductRepository,
    barcode: String,
) -> AppResult<Product> {
    repository.find_by_barcode(&barcode)?.ok_or_else(|| {
        AppError::NotFound("Producto no encontrado con ese código de barras".to_string())
    })
}

pub fn search_products(
    repository: &impl ProductRepository,
    term: String,
) -> AppResult<Vec<Product>> {
    repository.search(&term)
}

/// Sugerencias de búsqueda del POS (FR1.2, FR1.3): productos activos cuyo nombre o código
/// contiene el texto sin acentos ni mayúsculas, con "empieza con" primero. Un texto vacío
/// tras recortar devuelve una lista vacía; el mínimo de caracteres lo aplica la pantalla.
pub fn suggest_products(
    repository: &impl ProductRepository,
    term: String,
    limit: Option<usize>,
) -> AppResult<Vec<Product>> {
    if term.trim().is_empty() {
        return Ok(Vec::new());
    }
    let active = repository.find_active()?;
    Ok(matching::rank(active, &term, limit))
}

pub fn create_product(
    repository: &impl ProductRepository,
    storage: &impl ProductImageStorage,
    request: CreateProductRequest,
) -> AppResult<Product> {
    validate_create_request(&request)?;
    if let Some(barcode) = request.barcode.as_deref() {
        if repository.find_by_barcode(barcode)?.is_some() {
            return Err(AppError::Conflict(format!(
                "El producto con código de barras {barcode} ya existe"
            )));
        }
    }
    // BR5.1: en una creación, remove no es válido.
    let change = resolve_image_change(request.image.as_ref(), false)?;
    // BR2.2: la copia nueva se crea antes de escribir en la base.
    let new_file = match &change {
        ResolvedImageChange::Replace(path) => Some(storage.store(path)?),
        _ => None,
    };
    match repository.create(&request, new_file.as_deref()) {
        Ok(product) => Ok(product),
        Err(error) => {
            // BR2.2: si la base falla, no queda una copia huérfana.
            if let Some(file) = new_file {
                discard_copy(storage, &file);
            }
            Err(error)
        }
    }
}

pub fn update_product(
    repository: &impl ProductRepository,
    storage: &impl ProductImageStorage,
    request: UpdateProductRequest,
) -> AppResult<Product> {
    let current = get_product(repository, request.id)?;
    validate_update_request(&request, &current)?;

    if let Some(barcode) = request.barcode.as_deref() {
        if let Some(existing) = repository.find_by_barcode(barcode)? {
            if existing.id != request.id {
                return Err(AppError::Conflict(format!(
                    "El producto con código de barras {barcode} ya existe"
                )));
            }
        }
    }

    let change = resolve_image_change(request.image.as_ref(), true)?;
    let (new_file, file_update) = match &change {
        ResolvedImageChange::Keep => (None, ImageFileUpdate::Keep),
        ResolvedImageChange::Remove => (None, ImageFileUpdate::Clear),
        ResolvedImageChange::Replace(path) => {
            let file = storage.store(path)?;
            (Some(file.clone()), ImageFileUpdate::Set(file))
        }
    };

    match repository.update(&request, file_update) {
        Ok(product) => {
            // BR2.2 / BR2.3: la copia anterior se borra solo después de confirmar.
            if change != ResolvedImageChange::Keep {
                if let Some(old) = current.image_file.as_deref() {
                    if product.image_file.as_deref() != Some(old) {
                        discard_copy(storage, old);
                    }
                }
            }
            Ok(product)
        }
        Err(error) => {
            if let Some(file) = new_file {
                discard_copy(storage, &file);
            }
            Err(error)
        }
    }
}

pub fn delete_product(
    repository: &impl ProductRepository,
    storage: &impl ProductImageStorage,
    id: i64,
) -> AppResult<()> {
    let image_file = repository
        .find_by_id(id)?
        .and_then(|product| product.image_file);
    // BR2.4: si la eliminación se rechaza, la copia no se toca.
    repository.delete(id)?;
    if let Some(file) = image_file {
        discard_copy(storage, &file);
    }
    Ok(())
}

fn validate_create_request(request: &CreateProductRequest) -> AppResult<()> {
    if request.name.trim().is_empty() {
        return Err(AppError::Validation(
            "El nombre del producto no puede estar vacío".to_string(),
        ));
    }
    if request.price < 0.0 {
        return Err(AppError::Validation(
            "El precio no puede ser negativo".to_string(),
        ));
    }
    if request.stock.unwrap_or(0.0) < 0.0 {
        return Err(AppError::Validation(
            "El stock inicial no puede ser negativo".to_string(),
        ));
    }
    if request.min_stock.unwrap_or(0.0) < 0.0 {
        return Err(AppError::Validation(
            "El stock mínimo no puede ser negativo".to_string(),
        ));
    }
    validate_bulk_configuration(request.is_bulk, &request.unit)
}

fn validate_update_request(request: &UpdateProductRequest, current: &Product) -> AppResult<()> {
    if request
        .name
        .as_deref()
        .is_some_and(|name| name.trim().is_empty())
    {
        return Err(AppError::Validation(
            "El nombre del producto no puede estar vacío".to_string(),
        ));
    }
    if request.price.is_some_and(|price| price < 0.0) {
        return Err(AppError::Validation(
            "El precio no puede ser negativo".to_string(),
        ));
    }
    if request.min_stock.is_some_and(|stock| stock < 0.0) {
        return Err(AppError::Validation(
            "El stock mínimo no puede ser negativo".to_string(),
        ));
    }

    validate_bulk_configuration(
        request.is_bulk.unwrap_or(current.is_bulk),
        request.unit.as_deref().unwrap_or(&current.unit),
    )
}

fn validate_bulk_configuration(is_bulk: bool, unit: &str) -> AppResult<()> {
    if is_bulk && !BULK_UNITS.contains(&unit) {
        return Err(AppError::Validation(
            "Los productos a granel deben usar kg, litro o metro como unidad base".to_string(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_bulk_configuration;

    #[test]
    fn accepts_supported_bulk_units() {
        for unit in ["kg", "litro", "metro"] {
            assert!(validate_bulk_configuration(true, unit).is_ok());
        }
    }

    #[test]
    fn rejects_discrete_units_for_bulk_products() {
        assert!(validate_bulk_configuration(true, "pieza").is_err());
    }

    #[test]
    fn non_bulk_products_do_not_require_a_convertible_unit() {
        assert!(validate_bulk_configuration(false, "pieza").is_ok());
        assert!(validate_bulk_configuration(false, "kg").is_ok());
    }
}

#[cfg(test)]
mod suggest_tests {
    use super::*;

    fn product(id: i64, name: &str, active: bool) -> Product {
        Product {
            id,
            name: name.to_string(),
            description: None,
            barcode: None,
            price: 1.0,
            unit: "pieza".to_string(),
            is_bulk: false,
            category_id: None,
            category_name: None,
            stock: 3.0,
            min_stock: 0.0,
            active,
            created_at: String::new(),
            updated_at: String::new(),
            image_file: None,
        }
    }

    /// Repositorio falso: `find_active` devuelve todo lo cargado (como la consulta real,
    /// que ya filtra `active = 1`), salvo que se pida una falla.
    struct SuggestRepo {
        products: Vec<Product>,
        fail: bool,
    }

    impl SuggestRepo {
        fn new(products: Vec<Product>) -> Self {
            Self {
                products,
                fail: false,
            }
        }
    }

    impl ProductRepository for SuggestRepo {
        fn find_all(&self) -> AppResult<Vec<Product>> {
            Ok(self.products.clone())
        }
        fn find_active(&self) -> AppResult<Vec<Product>> {
            if self.fail {
                return Err(AppError::Database("falla simulada".to_string()));
            }
            Ok(self.products.clone())
        }
        fn find_by_id(&self, _id: i64) -> AppResult<Option<Product>> {
            unreachable!("suggest_products no relee por id")
        }
        fn find_by_barcode(&self, _barcode: &str) -> AppResult<Option<Product>> {
            unreachable!("suggest_products no busca por código exacto")
        }
        fn search(&self, _term: &str) -> AppResult<Vec<Product>> {
            unreachable!("suggest_products no usa LIKE")
        }
        fn create(
            &self,
            _request: &CreateProductRequest,
            _image_file: Option<&str>,
        ) -> AppResult<Product> {
            unreachable!()
        }
        fn update(
            &self,
            _request: &UpdateProductRequest,
            _image: ImageFileUpdate,
        ) -> AppResult<Product> {
            unreachable!()
        }
        fn delete(&self, _id: i64) -> AppResult<()> {
            unreachable!()
        }
    }

    #[test]
    fn returns_only_active_products_that_match_ignoring_accents() {
        let repo = SuggestRepo::new(vec![
            product(1, "Jamón", true),
            product(2, "Jamón viejo", false),
            product(3, "Queso", true),
        ]);
        let found = suggest_products(&repo, "JAMON".to_string(), Some(10)).unwrap();
        assert_eq!(found.iter().map(|p| p.id).collect::<Vec<_>>(), vec![1]);
    }

    #[test]
    fn orders_starts_with_first_and_returns_complete_products() {
        let repo = SuggestRepo::new(vec![
            product(1, "Agua de limón", true),
            product(2, "Limón", true),
        ]);
        let found = suggest_products(&repo, "limon".to_string(), None).unwrap();
        assert_eq!(found[0].id, 2);
        assert_eq!(found[0].stock, 3.0);
        assert_eq!(found[1].id, 1);
    }

    #[test]
    fn applies_the_limit_of_ten() {
        let repo = SuggestRepo::new(
            (0..25)
                .map(|i| product(i, &format!("Galleta {i:02}"), true))
                .collect(),
        );
        assert_eq!(
            suggest_products(&repo, "galleta".to_string(), Some(10))
                .unwrap()
                .len(),
            10
        );
    }

    #[test]
    fn limit_zero_returns_empty_and_no_limit_returns_all() {
        let repo = SuggestRepo::new(
            (0..25)
                .map(|i| product(i, &format!("Galleta {i:02}"), true))
                .collect(),
        );
        assert!(suggest_products(&repo, "galleta".to_string(), Some(0))
            .unwrap()
            .is_empty());
        assert_eq!(
            suggest_products(&repo, "galleta".to_string(), None)
                .unwrap()
                .len(),
            25
        );
    }

    #[test]
    fn blank_term_returns_an_empty_list_without_reading_the_repository() {
        let mut repo = SuggestRepo::new(vec![product(1, "Leche", true)]);
        repo.fail = true; // si leyera el repositorio, fallaría
        assert!(suggest_products(&repo, "   ".to_string(), None)
            .unwrap()
            .is_empty());
    }

    #[test]
    fn repository_errors_are_propagated() {
        let mut repo = SuggestRepo::new(vec![product(1, "Leche", true)]);
        repo.fail = true;
        let error = suggest_products(&repo, "leche".to_string(), None).unwrap_err();
        assert!(error.to_string().contains("falla simulada"));
    }
}

#[cfg(test)]
mod image_tests {
    use super::*;
    use std::cell::{Cell, RefCell};

    fn product(id: i64, image_file: Option<&str>) -> Product {
        Product {
            id,
            name: format!("Producto {id}"),
            description: None,
            barcode: None,
            price: 1.0,
            unit: "pieza".to_string(),
            is_bulk: false,
            category_id: None,
            category_name: None,
            stock: 0.0,
            min_stock: 0.0,
            active: true,
            created_at: String::new(),
            updated_at: String::new(),
            image_file: image_file.map(str::to_string),
        }
    }

    #[derive(Default)]
    struct FakeRepo {
        products: RefCell<Vec<Product>>,
        fail_write: Cell<bool>,
        reject_delete: Cell<bool>,
    }

    impl FakeRepo {
        fn with(product: Product) -> Self {
            let repo = Self::default();
            repo.products.borrow_mut().push(product);
            repo
        }
    }

    impl ProductRepository for FakeRepo {
        fn find_all(&self) -> AppResult<Vec<Product>> {
            Ok(self.products.borrow().clone())
        }
        fn find_active(&self) -> AppResult<Vec<Product>> {
            self.find_all()
        }
        fn find_by_id(&self, id: i64) -> AppResult<Option<Product>> {
            Ok(self.products.borrow().iter().find(|p| p.id == id).cloned())
        }
        fn find_by_barcode(&self, _barcode: &str) -> AppResult<Option<Product>> {
            Ok(None)
        }
        fn search(&self, _term: &str) -> AppResult<Vec<Product>> {
            self.find_all()
        }
        fn create(
            &self,
            _request: &CreateProductRequest,
            image_file: Option<&str>,
        ) -> AppResult<Product> {
            if self.fail_write.get() {
                return Err(AppError::Database("falla simulada".to_string()));
            }
            let created = product(99, image_file);
            self.products.borrow_mut().push(created.clone());
            Ok(created)
        }
        fn update(
            &self,
            request: &UpdateProductRequest,
            image: ImageFileUpdate,
        ) -> AppResult<Product> {
            if self.fail_write.get() {
                return Err(AppError::Database("falla simulada".to_string()));
            }
            let mut products = self.products.borrow_mut();
            let target = products.iter_mut().find(|p| p.id == request.id).unwrap();
            match image {
                ImageFileUpdate::Keep => {}
                ImageFileUpdate::Set(file) => target.image_file = Some(file),
                ImageFileUpdate::Clear => target.image_file = None,
            }
            Ok(target.clone())
        }
        fn delete(&self, id: i64) -> AppResult<()> {
            if self.reject_delete.get() {
                return Err(AppError::Conflict("tiene ventas".to_string()));
            }
            self.products.borrow_mut().retain(|p| p.id != id);
            Ok(())
        }
    }

    #[derive(Default)]
    struct FakeStorage {
        stored: RefCell<Vec<String>>,
        deleted: RefCell<Vec<String>>,
        fail_delete: Cell<bool>,
        read: RefCell<Vec<String>>,
        existing: RefCell<std::collections::HashMap<String, String>>,
    }

    impl ProductImageStorage for FakeStorage {
        fn inspect(&self, _source_path: &str) -> AppResult<ImagePreview> {
            Ok(ImagePreview {
                format: "png".to_string(),
                size_bytes: 1,
                preview: String::new(),
            })
        }
        fn store(&self, _source_path: &str) -> AppResult<String> {
            let name = format!("nuevo-{}.png", self.stored.borrow().len());
            self.stored.borrow_mut().push(name.clone());
            Ok(name)
        }
        fn delete(&self, file_name: &str) -> AppResult<()> {
            self.deleted.borrow_mut().push(file_name.to_string());
            if self.fail_delete.get() {
                return Err(AppError::Database("no se pudo borrar".to_string()));
            }
            Ok(())
        }
        fn read_data_url(&self, file_name: &str) -> AppResult<Option<String>> {
            self.read.borrow_mut().push(file_name.to_string());
            Ok(self.existing.borrow().get(file_name).cloned())
        }
        fn directory(&self) -> PathBuf {
            PathBuf::from("imgs")
        }
    }

    fn replace(path: &str) -> Option<ImageChange> {
        Some(ImageChange {
            kind: ImageChangeKind::Replace,
            source_path: Some(path.to_string()),
        })
    }

    fn change(kind: ImageChangeKind) -> Option<ImageChange> {
        Some(ImageChange {
            kind,
            source_path: None,
        })
    }

    fn create_request(image: Option<ImageChange>) -> CreateProductRequest {
        CreateProductRequest {
            name: "Nuevo".to_string(),
            description: None,
            barcode: None,
            price: 5.0,
            unit: "pieza".to_string(),
            is_bulk: false,
            category_id: None,
            stock: None,
            min_stock: None,
            image,
        }
    }

    fn update_request(id: i64, image: Option<ImageChange>) -> UpdateProductRequest {
        UpdateProductRequest {
            id,
            name: None,
            description: None,
            barcode: None,
            price: None,
            unit: None,
            is_bulk: None,
            category_id: None,
            min_stock: None,
            active: None,
            image,
        }
    }

    #[test]
    fn create_with_replace_stores_a_copy_and_saves_its_name() {
        let repo = FakeRepo::default();
        let storage = FakeStorage::default();
        let created = create_product(&repo, &storage, create_request(replace("a.png"))).unwrap();
        assert_eq!(created.image_file.as_deref(), Some("nuevo-0.png"));
        assert!(storage.deleted.borrow().is_empty());
    }

    #[test]
    fn create_with_a_database_failure_deletes_the_new_copy() {
        let repo = FakeRepo::default();
        repo.fail_write.set(true);
        let storage = FakeStorage::default();
        let result = create_product(&repo, &storage, create_request(replace("a.png")));
        assert!(result.is_err());
        assert_eq!(*storage.deleted.borrow(), vec!["nuevo-0.png".to_string()]);
    }

    #[test]
    fn create_rejects_remove_and_malformed_changes_without_touching_files() {
        let repo = FakeRepo::default();
        let storage = FakeStorage::default();
        let bad = [
            change(ImageChangeKind::Remove),
            change(ImageChangeKind::Replace),
            replace("   "),
            Some(ImageChange {
                kind: ImageChangeKind::Keep,
                source_path: Some("a.png".to_string()),
            }),
        ];
        for image in bad {
            let error = create_product(&repo, &storage, create_request(image))
                .unwrap_err()
                .to_string();
            assert_eq!(error, "Cambio de imagen no válido.");
        }
        assert!(storage.stored.borrow().is_empty());
        assert!(repo.products.borrow().is_empty());
    }

    #[test]
    fn replace_deletes_the_old_copy_only_after_a_successful_save() {
        let repo = FakeRepo::with(product(1, Some("viejo.png")));
        let storage = FakeStorage::default();
        let updated =
            update_product(&repo, &storage, update_request(1, replace("b.png"))).unwrap();
        assert_eq!(updated.image_file.as_deref(), Some("nuevo-0.png"));
        assert_eq!(*storage.deleted.borrow(), vec!["viejo.png".to_string()]);
    }

    #[test]
    fn a_failed_replace_keeps_the_old_copy_and_discards_the_new_one() {
        let repo = FakeRepo::with(product(1, Some("viejo.png")));
        repo.fail_write.set(true);
        let storage = FakeStorage::default();
        assert!(update_product(&repo, &storage, update_request(1, replace("b.png"))).is_err());
        assert_eq!(*storage.deleted.borrow(), vec!["nuevo-0.png".to_string()]);
        assert_eq!(
            repo.products.borrow()[0].image_file.as_deref(),
            Some("viejo.png")
        );
    }

    #[test]
    fn remove_clears_the_reference_and_deletes_the_copy() {
        let repo = FakeRepo::with(product(1, Some("viejo.png")));
        let storage = FakeStorage::default();
        let updated = update_product(
            &repo,
            &storage,
            update_request(1, change(ImageChangeKind::Remove)),
        )
        .unwrap();
        assert!(updated.image_file.is_none());
        assert_eq!(*storage.deleted.borrow(), vec!["viejo.png".to_string()]);
    }

    #[test]
    fn remove_on_a_product_without_image_does_nothing() {
        let repo = FakeRepo::with(product(1, None));
        let storage = FakeStorage::default();
        update_product(
            &repo,
            &storage,
            update_request(1, change(ImageChangeKind::Remove)),
        )
        .unwrap();
        assert!(storage.deleted.borrow().is_empty());
    }

    #[test]
    fn keep_and_missing_change_do_not_touch_files() {
        let repo = FakeRepo::with(product(1, Some("viejo.png")));
        let storage = FakeStorage::default();
        update_product(&repo, &storage, update_request(1, None)).unwrap();
        update_product(
            &repo,
            &storage,
            update_request(1, change(ImageChangeKind::Keep)),
        )
        .unwrap();
        assert!(storage.stored.borrow().is_empty());
        assert!(storage.deleted.borrow().is_empty());
        assert_eq!(
            repo.products.borrow()[0].image_file.as_deref(),
            Some("viejo.png")
        );
    }

    #[test]
    fn a_failing_old_copy_deletion_does_not_fail_the_save() {
        let repo = FakeRepo::with(product(1, Some("viejo.png")));
        let storage = FakeStorage::default();
        storage.fail_delete.set(true);
        let updated =
            update_product(&repo, &storage, update_request(1, replace("b.png"))).unwrap();
        assert_eq!(updated.image_file.as_deref(), Some("nuevo-0.png"));
    }

    #[test]
    fn delete_removes_the_copy_only_when_the_product_is_deleted() {
        let repo = FakeRepo::with(product(1, Some("viejo.png")));
        let storage = FakeStorage::default();

        repo.reject_delete.set(true);
        assert!(delete_product(&repo, &storage, 1).is_err());
        assert!(storage.deleted.borrow().is_empty());

        repo.reject_delete.set(false);
        delete_product(&repo, &storage, 1).unwrap();
        assert_eq!(*storage.deleted.borrow(), vec!["viejo.png".to_string()]);
    }

    #[test]
    fn inspect_and_directory_delegate_to_the_storage() {
        let storage = FakeStorage::default();
        assert_eq!(
            inspect_product_image(&storage, "a.png".to_string())
                .unwrap()
                .format,
            "png"
        );
        assert_eq!(get_product_images_dir(&storage), "imgs");
    }

    const VALID_NAME: &str = "0b59dd70-205d-4bbc-806c-d812c4a2a8be.jpg";

    #[test]
    fn read_product_image_returns_the_data_url_of_a_stored_copy() {
        let storage = FakeStorage::default();
        storage
            .existing
            .borrow_mut()
            .insert(VALID_NAME.to_string(), "data:image/jpeg;base64,AAAA".to_string());

        let found = read_product_image(&storage, VALID_NAME.to_string()).unwrap();

        assert_eq!(found.as_deref(), Some("data:image/jpeg;base64,AAAA"));
    }

    #[test]
    fn read_product_image_returns_none_when_the_copy_is_gone() {
        let storage = FakeStorage::default();
        assert!(read_product_image(&storage, VALID_NAME.to_string())
            .unwrap()
            .is_none());
    }

    #[test]
    fn read_product_image_never_reads_a_name_outside_the_folder() {
        let storage = FakeStorage::default();
        for name in ["../x.png", "C:\\secreto.png", "a/b.png", "foto.png", ""] {
            assert!(read_product_image(&storage, name.to_string())
                .unwrap()
                .is_none());
        }
        assert!(storage.read.borrow().is_empty());
    }
}
