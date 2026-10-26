# Resumen de código — U1 product-image

## Qué se construyó

Imagen opcional por producto: el administrador elige, cambia o quita una imagen en el diálogo de producto. La copia se guarda en `<app_data_dir>/product-images` con nombre `<uuid>.<ext>`, el original nunca se toca y U3 recibe el contrato `productImageSource` / `useProductImageSource`.

## Archivos

- **Creados (9):** migración `0007_products_image_file.sql`; `image.rs` (reglas puras); `adapters/outbound/filesystem.rs` (almacenamiento); `ProductImageField.tsx`; `useProductImageSource.ts`; `productImage.ts`; `productImageField.ts`; `productImage.test.ts`; `productImageField.test.ts`.
- **Modificados (17):** `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, `bootstrap.rs`, `migrations.rs`, `models/product.rs`, `products/mod.rs`, `application.rs`, `adapters/inbound/tauri.rs`, `adapters/outbound/mod.rs`, `adapters/outbound/sqlite.rs`, ventas (`inbound/tauri.rs`, `outbound/sqlite.rs`), `settings/.../filesystem.rs`, `types.ts`, `ProductService.ts`, `ProductsPage.tsx`.
- La lista completa está en `source-manifest.json`.

## Decisiones clave

- Protocolo de archivos de Tauri (`protocol-asset`) con alcance `$APPDATA/product-images/**`, solo esa carpeta; la CSP sigue en `null`.
- Migración `0007` con índice único parcial sobre `image_file` y detección de bases heredadas.
- Orden de BR2.2: validar, copiar a temporal y renombrar, escribir en la base en una transacción, borrar la copia nueva si falla o la vieja si tiene éxito.
- `update` de productos ahora corre en una transacción única.
- El estado del campo guarda `beforeRemove` para que "Deshacer" vuelva al cambio previo (BR5.2).
- Los errores de guardado se muestran en un `Alert` dentro del diálogo.

## Cobertura de pruebas

| Comando | Resultado |
|---|---|
| `cargo test ... modules::catalog::products` | 46 pasaron |
| `cargo test ... infrastructure::sqlite::migrations` | 7 pasaron |
| `cargo test ... modules::sales` | 5 pasaron |
| `cargo test` (completo) | 117 pasaron |
| `npx vitest run src/__tests__/modules/catalog/products` | 21 pasaron |
| `npm test` (completo) | 155 pasaron |
| `cargo check` | sin errores |

## Desviaciones del plan

- El puerto `delete` devuelve `AppResult<()>`; la advertencia de BR2.7 se registra en el helper `discard_copy` de `application.rs` (mismo comportamiento, más fácil de probar).
- Las pruebas de casos de uso están en el módulo `image_tests` de `application.rs`.
- Se agregó la prueba `deleting_a_free_product_removes_the_row`.
- `ProductsPage` suma `saving` y `handleCloseDialog` (Cancelar descarta el cambio pendiente).
- **`npm run build` falla por un problema previo de configuración:** `tsconfig.json` pide `ignoreDeprecations: "6.0"` y `node_modules` trae TypeScript 5.8.3 (TS5103). No se modificó. Con `npx tsc --noEmit --ignoreDeprecations 5.0` no hay errores y `npx vite build` termina bien.

## Corrección tras el checkpoint (pasos 22 a 26)

Reporte: al editar un producto con imagen guardada, el formulario decía "No se encontró la imagen guardada". Las copias sí estaban en `product-images`, así que la pantalla no podía abrirlas por el protocolo de archivos.

- **Respaldo:** nuevo comando `read_product_image` (valida `<uuid-v4>.(png|jpg|webp)`, lee solo dentro de `product-images`, devuelve la data URL o nulo). `ProductImageField` lo usa una sola vez por imagen cuando la carga por protocolo falla; si tampoco se puede, muestra el aviso de imagen faltante.
- **Diagnóstico:** cuando una imagen no carga, la consola registra la ruta que falló (`console.warn`), para identificar la causa real del protocolo de archivos en la próxima ejecución.
- **Pruebas nuevas (6):** casos de uso (`read_product_image` con copia, sin copia y con nombres fuera de la carpeta), almacenamiento (lectura y nombres confinados) y una prueba que fija el alcance de `tauri.conf.json` a la carpeta de imágenes.
- **Límite:** no se pudo levantar el alcance real de Tauri en una prueba (el ejecutable de prueba con la característica `test` no arranca en Windows), así que la causa exacta del fallo del protocolo de archivos sigue sin confirmar. El respaldo hace que la imagen se vea aunque el protocolo no la sirva. No hay prueba de componente para el cableado del respaldo (el proyecto no tiene entorno de DOM).
- **Resultados:** `cargo test ... modules::catalog::products` 46 pasaron; `cargo check` y `tsc --noEmit --ignoreDeprecations 5.0` sin errores.

## Corrección tras Request Changes del checkpoint (pasos 27 y 28)

Reporte de la persona: la consola mostraba `403 (Forbidden)` para `http://asset.localhost/C%3A%5C...%5CRoaming%5Ccom.angel-almanza.almanza-pos-desktop%5Cprod...`.

- **Causa real:** en Tauri 2 la variable `$APPDATA` ya resuelve a `app_data_dir`, que incluye el identificador de la app (`tauri-2.10.2/src/path/mod.rs`, `BaseDirectory::AppData => app_data_dir()`). El alcance `$APPDATA/com.angel-almanza.almanza-pos-desktop/product-images/**` apuntaba a `<Roaming>/<id>/<id>/product-images`, que no existe, y el protocolo negaba la ruta real. La prueba anterior solo comparaba el texto del JSON con ese mismo valor, así que fijaba el error.
- **Arreglo:** `tauri.conf.json` usa `$APPDATA/product-images/**` (sin ampliar más allá de `product-images`) y la prueba del alcance ahora exige ese valor.
- **Diseño funcional:** `functional-spec.md` documenta la configuración correcta, el índice único parcial, el orden de lectura en W3 y W6, el formato de la vista previa y el umbral de miniaturas.
- **Resultados:** `cargo test` completo 117 pasaron; `npx vitest run src/__tests__/modules/catalog/products` 21 pasaron. La prueba sigue siendo textual: la carga real depende de correr la app.
- **Respaldo `read_product_image` (pasos 22 a 26):** se conserva y está cubierto por 6 pruebas de Rust (casos de uso con copia, sin copia y con nombres fuera de la carpeta; almacenamiento confinado) y 2 de Vitest (`load-failed` con y sin respaldo). Solo protege el formulario: `useProductImageSource`, que consumirá U3, depende del protocolo de archivos. Con el alcance corregido el respaldo es una red de seguridad; si la prueba en la app aún falla, hay que exponerlo por el hook antes de U3.
- **Decisión sobre `.tmp` huérfano:** se acepta el residuo si la app se cierra entre escribir y renombrar la copia; no hay limpieza al arrancar.
- **Desviación:** `unit-test-instructions.md` no se editó después de la aprobación del plan; la lista de pruebas del respaldo queda en este resumen. `traceability.json` no cambia: el respaldo no tiene un ID de requisito propio y refuerza BR3.1 y AC4.7.
- **Limpieza de disco:** el disco estaba lleno (127 MB libres) y se borró `src-tauri/target/debug/incremental` (caché regenerable de compilación).

## Pendiente para Build and Test

- Confirmar con la app corriendo (`npm run tauri dev`, que reinicia con la configuración nueva) que la imagen guardada carga sin 403 y que una ruta fuera de `product-images` no se sirve.
- Decidir cómo resolver la versión de TypeScript para que `npm run build` pase.

## Sources

- `code-generation-plan.md`, `unit-test-instructions.md` y los artefactos de `functional-design/` de U1.
- Informe del desarrollador de esta pasada.
