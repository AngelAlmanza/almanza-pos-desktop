## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-26T19:43:43Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/product-image/functional-design/functional-spec.md > Configuración de la app | El diseño depende del protocolo de archivos (asset protocol) de Tauri, pero solo menciona habilitarlo en la configuración. En el repositorio, `src-tauri/Cargo.toml` declara `tauri = { version = "2", features = [] }` y `tauri.conf.json` no tiene `assetProtocol`. En Tauri 2 el protocolo exige la característica Cargo `protocol-asset` además de `app.security.assetProtocol.enable` y `scope`. Además, el alcance se expresa con una variable de ruta (por ejemplo `$APPDATA/...`), que debe coincidir con `app_data_dir`, no con una ruta fija. | Agregar a la sección: la característica `protocol-asset` en Cargo.toml, `assetProtocol.enable = true` y el `scope` exacto con la variable que resuelve a la misma carpeta que usa el backend. Indicar que "Obtener la carpeta de imágenes" debe devolver una ruta que `convertFileSrc` pueda usar en Windows. | Unresolved |
| R-02 | Major | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/product-image/functional-design/entities.md > Product.image_file (`unique: true`) y rules.md > BR4.1 | `image_file` se declara único, pero la migración 0007 es un `ALTER TABLE ... ADD COLUMN` (el patrón de las migraciones 0002 a 0005), y SQLite no permite agregar una columna con `UNIQUE`. Quien implemente tendrá que adivinar si crear un índice único aparte o dejar la unicidad solo por UUID. Como el valor es anulable, el índice debe ser parcial (`WHERE image_file IS NOT NULL`) o aceptar varios nulos. | Decidir y escribir en BR4.1 si la unicidad se garantiza con un índice único parcial creado en la misma migración, o quitar `unique: true` y explicar que la unicidad viene del UUID. | Unresolved |
| R-03 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/product-image/functional-design/functional-spec.md > W6 y tabla de Operaciones (Eliminar producto) | La eliminación de producto hoy recibe solo el id (`delete_product` en `products/application.rs`). Para borrar la copia (BR2.4) hace falta leer `image_file` antes de eliminar, y el spec no lo dice. Además, el puerto de almacenamiento debe validar `image_file` con BR2.6 antes de borrar. | Indicar en W6 que el caso de uso lee el producto primero, conserva `image_file`, elimina y, solo si tuvo éxito, borra la copia validada con BR2.6. | Unresolved |
| R-04 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/product-image/functional-design/functional-spec.md > W3 y rules.md > BR2.2 | No se define qué ocurre con dos guardados concurrentes del mismo producto, ni con la actualización parcial cuando `ImageChange = replace` y el resto de campos no cambian. El `Database` es un `Mutex<Connection>`, así que la transacción serializa, pero la copia anterior que se borra debe leerse dentro de esa misma sección crítica. Si se lee antes, se puede borrar una copia que ya no es la vigente. | Aclarar que `image_file` anterior se lee dentro de la transacción de actualización y que esa es la copia que se borra tras confirmar. | Unresolved |
| R-05 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/product-image/functional-design/functional-spec.md > Assumptions & Open Questions (NFR2) | NFR2 queda sostenido solo por la carga diferida de U3, sin miniaturas. Con imágenes de hasta 5 MB y cientos de productos, la cuadrícula decodifica imágenes completas en la WebView. El riesgo está aceptado y la medición se difiere a Build and Test, pero no hay umbral numérico ni criterio de decisión. | Fijar en el spec el umbral medible (por ejemplo, tiempo de primera pintura y memoria con 500 productos) que activaría las miniaturas. | Unresolved |
| R-06 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/product-image/functional-design/entities.md > entity ImagePreview.preview | La vista previa se devuelve como contenido del archivo (hasta 5 MiB) por IPC, probablemente en base64. El formato, el tipo MIME y el costo de memoria no están definidos. El contrato de U3 depende de esto solo en el formulario, pero un desarrollador tendría que adivinar la forma del valor. | Definir el formato de `preview` (por ejemplo, data URL con el MIME detectado) y anotar el tamaño máximo esperado. | New |

> R-01 Reviewer note: La sección "Configuración de la app" sigue sin mencionar la feature de Cargo `protocol-asset`, ni que el `scope` debe usar una variable de ruta que coincida con `app_data_dir`. Tampoco aclara cómo se arma la URL desde la ruta devuelta por "Obtener la carpeta de imágenes" (`convertFileSrc` en Windows). Baja a Minor porque es detalle de configuración que Code Generation puede resolver, pero conviene dejarlo escrito.

> R-02 Reviewer note: `entities.md` mantiene `Product.image_file` con `unique: true`, y BR4.1 describe solo "agregar la columna opcional". SQLite no permite `ADD COLUMN ... UNIQUE`. El diseño sigue sin decidir entre un índice único parcial (`WHERE image_file IS NOT NULL`) y quitar `unique`.

> R-03 Reviewer note: W6 y la operación "Eliminar producto" no indican que se lee `image_file` antes de borrar la fila. La copia se borra solo después de confirmar la eliminación y tras validar el nombre con BR2.6.

> R-04 Reviewer note: W3 y BR2.2 no indican que la copia anterior se lee dentro de la misma transacción de actualización. Sin eso, dos guardados concurrentes pueden borrar la copia equivocada.

> R-05 Reviewer note: La suposición sobre NFR2 no da un umbral numérico (por ejemplo, el tiempo de primer render con N tarjetas) para decidir cuándo hacen falta miniaturas.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| (ninguna listada) | N/A | La etapa no define herramientas de validación. |

### Summary

El diseño es implementable: los flujos, las reglas y la máquina de estados están completos y son coherentes con los contratos de U3. Queda un hallazgo Major abierto (R-02, `unique` imposible con `ADD COLUMN` en SQLite), que cabe dentro del límite de READY, más cuatro Minor.
