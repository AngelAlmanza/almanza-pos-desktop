# Plan de generación de código — U1 product-image

## Summary

- Builds: imagen opcional por producto (elegir, cambiar, quitar), con validación y almacenamiento seguro en la carpeta de la app, y el contrato `productImageSource` que usará U3.
- Touches: migración `0007`, `models/product.rs`, slice `catalog/products` (Rust), `find_product` de ventas, `tauri.conf.json`, `ProductsPage`, `ProductService` y un campo nuevo `ProductImageField`.
- Tests: unos 40 (Rust: reglas, almacenamiento, casos de uso, repositorio y migración; Vitest: máquina de estados del campo y `productImageSource`), con el conjunto existente en verde.

## Alcance y decisiones heredadas

- Unidad: `product-image` (U1, `service`). Implementa FR4.1–FR4.14 y AC4.1–AC4.9 con las reglas BR1.1–BR5.2 de `functional-design/rules.md`.
- Q1 = A: la pantalla carga el archivo directo desde la carpeta de imágenes con el protocolo de archivos de Tauri (`convertFileSrc`), limitado a esa carpeta. No se generan miniaturas.
- Q2 = A: se valida la firma (primeros bytes). Un archivo dañado por dentro se acepta y se ve como placeholder.
- Proyecto existente (brownfield): se modifican los archivos en su lugar. No se crean duplicados.
- Fuera de esta unidad: mostrar la imagen en la cuadrícula del POS (U3). U1 solo entrega el contrato `productImageSource` y el hook `useProductImageSource`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "refactor",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:322f3cce51ad835b556974215be0ae0a5aba55c673c92ff6b1b327e7eb2426e8",
  "contract_sha256": "sha256:84a32ec0d9dd634774d2a290b523e6e0d5e6f77259469f3112500519cb132392"
}
```

## Pasos de implementación

La metodología es test-after: se implementa cada capa y después se escriben y corren sus pruebas. Los comandos exactos, acotados a esta unidad, están en `unit-test-instructions.md`.

### Esqueleto y configuración de producción

- [x] **Step 1 — Configuración del protocolo de archivos.** `src-tauri/Cargo.toml`: agregar la característica `protocol-asset` a `tauri`. `src-tauri/tauri.conf.json`: `app.security.assetProtocol` con `enable: true` y alcance solo `$APPDATA/product-images/**` (corregido en el Step 27: `$APPDATA` ya incluye el identificador); la CSP sigue en `null`. (BR3.2, NFR4)
- [x] **Step 2 — Esqueleto de módulos.** Crear `modules/catalog/products/image.rs` (reglas puras) y `adapters/outbound/filesystem.rs` (almacenamiento) y declararlos en los `mod.rs` correspondientes. Dejar `pub(crate)` el helper `bytes_to_data_url` de `modules/settings/adapters/outbound/filesystem.rs` para reutilizarlo en la vista previa.

### Verificación del ejecutor de pruebas

- [x] **Step 3 — Verificar los ejecutores.** Correr `cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products` y `npx vitest run src/__tests__/modules/shared/utils/formatCurrency.test.ts` para confirmar que ambos ejecutores funcionan antes de agregar pruebas. Registrar los comandos en `unit-test-instructions.md`. No hace falta configuración nueva: `vitest.config.ts` ya resuelve `@modules`.

### Modelo de datos y base de datos

- [x] **Step 4 — Migración `0007`.** Crear `infrastructure/sqlite/migrations/0007_products_image_file.sql` con `ALTER TABLE products ADD COLUMN image_file TEXT;` y un índice único parcial sobre `image_file` donde no sea nulo. Registrarla en `MIGRATIONS` de `migrations.rs` y agregar a `detect_legacy_version` la detección de la columna (devuelve 7) para bases sin historial. No se edita ninguna migración aplicada. (BR4.1, FR4.13)
- [x] **Step 5 — Modelos Rust.** `models/product.rs`: `Product.image_file: Option<String>`; `ImageChange { kind, source_path }` con `kind` en `keep | replace | remove` y `#[serde(default)]`; `ImagePreview { format, size_bytes, preview }`; `CreateProductRequest.image` y `UpdateProductRequest.image` como `Option<ImageChange>`. Actualizar el `Product` literal de las pruebas de `sales/adapters/inbound/tauri.rs`. (BR5.1)
- [x] **Step 6 — Pruebas de migración y modelo.** En `migrations.rs`: la columna existe y es nula en productos previos, productos y datos intactos, repetir `apply` es idempotente, y la detección heredada reconoce la columna. En `models/product.rs`: deserialización de `ImageChange` (sin campo = `keep`, `replace` con ruta, `remove`). Correr el filtro de migraciones y de modelos.

### Repositorio / acceso a datos

- [x] **Step 7 — Repositorio de productos.** `adapters/outbound/sqlite.rs`: agregar `p.image_file` a `SELECT_QUERY` y a `row_to_product`; `create` recibe el `image_file` inicial; `update` recibe un `ImageFileUpdate` (`Keep`, `Set(nombre)`, `Clear`) y se ejecuta dentro de una transacción única (BR2.2). `delete` sigue rechazando productos con ventas o ajustes. Ajustar el esquema de prueba del módulo. (FR4.1, FR4.6)
- [x] **Step 8 — `find_product` de ventas.** `modules/sales/adapters/outbound/sqlite.rs`: seleccionar `p.image_file` y mapearlo en su propio `Product`. (BR4.1)
- [x] **Step 9 — Pruebas del repositorio.** Crear con imagen, actualizar con `Set`, `Clear` y `Keep`, la transacción revierte si una instrucción falla, eliminar con ventas no cambia nada y `find_product` de ventas devuelve el campo. Correr `cargo test ... modules::catalog::products::adapters::outbound::sqlite` y `modules::sales`.

### Lógica de negocio

- [x] **Step 10 — Reglas puras de imagen.** `image.rs`: detección de formato por firma (PNG, JPEG, WebP), validación de extensión, tamaño (1 a 5 242 880 bytes), generación del nombre `<uuid-v4>.<ext>` (jpeg → `.jpg`) y `is_valid_image_file_name` que rechaza `/`, `\`, `..`, `:` y rutas absolutas. Los mensajes de error siguen la tabla de `functional-spec.md`. (BR1.1–BR1.3, BR2.6)
- [x] **Step 11 — Almacenamiento en disco.** `adapters/outbound/filesystem.rs` con `LocalProductImageStorage` sobre `<app_data_dir>/product-images`: `inspect` (lee el origen solo en lectura, valida y devuelve vista previa), `store` (valida de nuevo, crea la carpeta, escribe un temporal y lo renombra, nunca modifica el original), `delete` (solo nombres válidos; una falla se registra con `eprintln!` y no se propaga) y `directory`. (BR1.4, BR2.1, BR2.5, BR2.6, BR2.7)
- [x] **Step 12 — Casos de uso.** `application.rs`: puerto `ProductImageStorage`, tipo `ImageFileUpdate` y las funciones `inspect_product_image`, `get_product_images_dir`, `create_product`, `update_product` y `delete_product` con almacenamiento. Orden de BR2.2: validar el producto y el cambio de imagen (BR5.1), crear la copia nueva, escribir en la base, borrar la copia nueva si la base falla y borrar la anterior solo si el guardado tuvo éxito. Quitar y eliminar borran la copia solo después de confirmar (BR2.3, BR2.4). (FR4.6–FR4.10)
- [x] **Step 13 — Pruebas de la lógica.** Reglas puras: firmas válidas e inválidas, extensiones, límites 0 / 5 242 880 / 5 242 881, confinamiento (`../x.png`, ruta absoluta, separadores). Almacenamiento con carpeta temporal: copia correcta y original intacto, nombre según la firma, origen inexistente, borrado de un nombre inválido ignorado. Casos de uso con repositorio y almacenamiento falsos: creación con falla de base borra la copia nueva, reemplazo y quitar borran la copia vieja, eliminar con ventas no borra, cambio mal formado se rechaza. Correr `cargo test ... modules::catalog::products`.

### API / comandos

- [x] **Step 14 — Comandos Tauri.** `adapters/inbound/tauri.rs`: nuevos `inspect_product_image` y `get_product_images_dir`; `create_product`, `update_product` y `delete_product` reciben `AppHandle` para construir el almacenamiento con `app_data_dir`. Registrar los dos comandos nuevos en `bootstrap.rs`. (FR4.2–FR4.6)
- [x] **Step 15 — Pruebas de los comandos.** La frontera de comandos es delgada: se verifica con `cargo check` y con pruebas del caso de uso que cubren la serialización de `ImageChange` y de `ImagePreview` (JSON de ida y vuelta). Correr `cargo test ... modules::catalog::products::adapters::inbound`.

### Frontend

- [x] **Step 16 — Tipos y servicio.** `types.ts`: `Product.image_file: string | null`, `ProductImageChange` y `image?` en `CreateProductDTO` y `UpdateProductDTO`. `ProductService`: `inspectImage(sourcePath)` y `getImagesDir()`.
- [x] **Step 17 — Utilidades puras y hook.** `utils/productImage.ts`: `isValidProductImageFile` y `resolveProductImageSource(imageFile, dir, convert)`. `utils/productImageField.ts`: reductor de la máquina de estados (`empty`, `saved`, `pending-new`, `pending-remove`, `error`, `missing`) y `toImageChange`. `hooks/useProductImageSource.ts`: carga la carpeta una vez, la guarda en memoria y expone `productImageSource` para U3. (BR2.6, BR3.1, BR5.1, BR5.2)
- [x] **Step 18 — `ProductImageField` y `ProductsPage`.** Componente nuevo con selector nativo (filtro png, jpg, jpeg, webp), vista previa, "Quitar", "Deshacer", nota "No se encontró la imagen guardada" y `data-testid` en los elementos interactivos. La página pasa el diálogo a `maxWidth="md"` en dos columnas, guarda el cambio pendiente, lo envía al crear o actualizar, descarta el cambio al cancelar y muestra los errores de guardado en un `Alert` dentro del diálogo. (FR4.2–FR4.9, FR4.12)
- [x] **Step 19 — Pruebas del frontend.** `src/__tests__/modules/catalog/products/productImageField.test.ts` (transiciones de la tabla, `toImageChange`, cancelar descarta, error conserva el cambio previo) y `productImage.test.ts` (nulo, inválido, válido, rutas con `\` o `/`). Correr `npx vitest run src/__tests__/modules/catalog/products`.

### Configuración de entorno y compilación

- [x] **Step 20 — Verificar el empaquetado.** Correr `cargo check --manifest-path src-tauri/Cargo.toml` (valida que el alcance del protocolo de archivos coincide con la característica) y `npm run build` (revisión de tipos y empaquetado). Confirmar que ningún umbral de pruebas ni configuración se relajó.

### Documentación y trazabilidad

- [x] **Step 21 — Resumen y trazabilidad.** Escribir `code-summary.md`, `traceability.json` y `source-manifest.json` con todas las rutas creadas o modificadas. Comentarios en línea solo donde la razón no sea obvia (confinamiento, orden de BR2.2).

### Corrección tras la revisión del checkpoint (la imagen guardada no se muestra al editar)

Reporte de la persona: al elegir una imagen en agregar o editar, el sistema la detecta, pero al volver a editar el producto dice "No se encontró la imagen guardada". Las copias sí existen en `<app_data_dir>/product-images` (se verificó en disco), así que la falla está en cómo la pantalla abre la copia guardada (BR3.1, BR3.2, FR4.12, AC4.7). Esto no cambia el diseño funcional ni las reglas.

- [x] **Step 22 — Diagnóstico de la carga.** Agregar una prueba de Rust que construya el alcance del protocolo de archivos con la misma entrada de `tauri.conf.json` y compruebe que una copia real bajo `product-images` (ruta con espacios y con prefijo `\\?\`) queda permitida y que una ruta fuera de la carpeta no. En `ProductImageField`, registrar con `console.warn` la fuente que falló al cargar, para que el siguiente fallo en la app sea diagnosticable.
- [x] **Step 23 — Corregir la causa encontrada.** Si el alcance no coincide, corregir `tauri.conf.json` sin ampliarlo más allá de `product-images`. Si el alcance es correcto, la causa está en la URL o en la carga, y se corrige ahí (`useProductImageSource` o `ProductImageField`).
- [x] **Step 24 — Respaldo que no depende del protocolo de archivos.** Nuevo comando `read_product_image(image_file)` que valida el nombre (BR2.6), lee la copia solo dentro de `product-images` y devuelve su data URL, o nulo si falta. `ProductService.readImage` lo expone y `ProductImageField` lo usa solo cuando la carga por protocolo falla. Así el formulario muestra la imagen guardada aunque el protocolo no la sirva, y U3 puede reutilizarlo. Se pide una imagen a la vez, solo cuando falla la carga directa.
- [x] **Step 25 — Pruebas de la corrección.** Rust: el comando respalda nombre válido, nombre inválido (`../x.png`), archivo ausente y límite de 5 MB; la prueba de alcance del Step 22. Vitest: `load-failed` con respaldo disponible vuelve a `saved`; sin respaldo pasa a `missing`. Correr los comandos de `unit-test-instructions.md`.
- [x] **Step 26 — Verificación final y resumen.** Repetir `cargo check`, la suite de la unidad y el comando de verificación del checkpoint; actualizar `code-summary.md`, `traceability.json` y `source-manifest.json`.

### Corrección tras Request Changes del checkpoint (403 Forbidden del protocolo de archivos)

Reporte de la persona: la consola muestra `Failed to load resource: the server responded with a status of 403 (Forbidden)` para `http://asset.localhost/C%3A%5CUsers%5C...%5CRoaming%5Ccom.angel-almanza.almanza-pos-desktop%5Cprod...`. La causa es el alcance: en Tauri 2 la variable `$APPDATA` ya resuelve a `app_data_dir` (que incluye el identificador), así que `$APPDATA/com.angel-almanza.almanza-pos-desktop/product-images/**` apunta a una carpeta que no existe y el protocolo deniega la ruta real. El diseño funcional ya se corrigió (`functional-spec.md`, "Configuración de la app").

- [x] **Step 27 — Corregir el alcance.** `tauri.conf.json`: `app.security.assetProtocol.scope` pasa a `["$APPDATA/product-images/**"]`, sin ampliarlo más allá de `product-images`. En `adapters/inbound/tauri.rs`, la prueba del alcance (Step 22) deja de armar la ruta con el identificador: resuelve `$APPDATA` igual que Tauri (`app_data_dir`, que ya lo incluye) y comprueba que la copia real bajo `<app_data_dir>/product-images` queda permitida y que una ruta fuera, o bajo `<carpeta de datos>/product-images` sin el identificador, no. (BR3.2, FR4.12, AC4.7)
- [x] **Step 28 — Verificación y resumen.** Correr los comandos de `unit-test-instructions.md`, `cargo check` y el comando de verificación del checkpoint. Actualizar `code-summary.md` (causa real, cifras de pruebas actuales, nota de que el respaldo `read_product_image` no cubre la cuadrícula de U3 y que el hook sigue dependiendo del protocolo), `traceability.json` y `unit-test-instructions.md` (respaldo y sus pruebas). Se acepta el residuo de `.tmp` huérfano (R-01 previo) y se anota la decisión. La carga real en la app corriendo queda para Build and Test.

## Trazabilidad de pasos

| Paso | Requisitos y reglas |
|---|---|
| 1, 2 | NFR4, BR3.2 |
| 4, 5, 6 | FR4.13, NFR5, BR4.1, BR5.1 |
| 7, 8, 9 | FR4.1, FR4.6, FR4.9, FR4.10, BR2.2, BR2.4 |
| 10, 11, 12, 13 | FR4.3, FR4.4, FR4.6–FR4.11, NFR4, BR1.1–BR1.4, BR2.1–BR2.7 |
| 14, 15 | FR4.2, FR4.5, FR4.6 |
| 16–19 | FR4.2, FR4.5, FR4.7, FR4.8, FR4.12, BR3.1, BR5.2 |
| 20 | NFR2, NFR4, NFR7 |
| 22–28 | FR4.12, AC4.7, NFR4, BR2.6, BR3.1, BR3.2 |

## Sources

- `functional-design/functional-spec.md`, `rules.md`, `entities.md` (U1).
- `units-generation/unit-of-work.md` (U1 y contrato con U3) y `requirements-analysis/requirements.md` (FR4, NFR2, NFR4, NFR5, NFR7).
- Código actual: `src-tauri/src/modules/catalog/products/`, `src-tauri/src/modules/settings/adapters/outbound/filesystem.rs` (patrón de almacenamiento), `src-tauri/src/infrastructure/sqlite/migrations.rs`, `src/modules/catalog/products/`.

## Assumptions & Open Questions

- [assumption] En Tauri 2, `$APPDATA` ya resuelve a `app_data_dir` (`<Roaming>/<identificador>` en Windows), así que el alcance del protocolo de archivos es `$APPDATA/product-images/**`. Se confirma al correr la app (`npm run tauri dev`) en Build and Test.
- [assumption] Un índice único parcial sobre `image_file` es seguro porque el nombre es un UUID v4 generado por la app.
- [assumption] La prueba del almacenamiento usa una carpeta temporal bajo `std::env::temp_dir()` con un UUID, porque el proyecto no tiene `tempfile`; no se agrega una dependencia nueva.
