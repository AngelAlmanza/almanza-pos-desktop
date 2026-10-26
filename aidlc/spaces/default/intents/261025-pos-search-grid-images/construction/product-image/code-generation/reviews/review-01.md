## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-26T14:21:50Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | src-tauri/src/modules/catalog/products/adapters/outbound/filesystem.rs > `LocalProductImageStorage::store` | La copia se escribe como `<uuid>.<ext>.tmp` y luego se renombra. Si la app se cierra entre la escritura y el renombrado, o si falla el borrado del temporal, queda un `.tmp` huérfano. Nada lo limpia al arrancar. El caso está acotado (el temporal se borra en los errores normales), pero BR2.7 solo cubre copias viejas. | Decidir si basta con aceptar el residuo, o añadir una limpieza de `*.tmp` al obtener la carpeta de imágenes. Anotar la decisión en el resumen. | New |
| R-02 | Minor | src-tauri/tauri.conf.json > `app.security.assetProtocol.scope` | El alcance usa `$APPDATA/com.angel-almanza.almanza-pos-desktop/product-images/**`. Coincide con `app_data_dir` en Windows (identificador verificado en el mismo archivo), pero en Linux `$APPDATA` y `app_data_dir` difieren. Además, `code-summary.md` lista como pendiente confirmar que `convertFileSrc` carga las imágenes con la app corriendo. Esa verificación en ejecución no está hecha, así que BR3.2 y AC4.7 solo están comprobados estáticamente. | Confirmar en Build and Test, en Windows con la app corriendo, que una imagen guardada carga y que una ruta fuera de `product-images` no. Si se apunta a otras plataformas, revisar el alcance. | New |
| R-03 | Minor | src/modules/catalog/products/components/ProductImageField.tsx y src/modules/catalog/products/pages/ProductsPage.tsx > cableado del campo | La traceability.json asigna AC4.7 y BR3.3 a estos archivos, pero las pruebas de la unidad cubren solo lógica pura (el reductor y `productImageSource`). Nada ejercita el componente ni el cableado de Cancelar, Guardar y el `Alert` de error. La máquina de estados y la transacción sí están bien probadas. | Aceptar la brecha o cubrirla en Build and Test con una prueba manual o de componente de los flujos de Cancelar y de guardado fallido. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `cargo test ... modules::catalog::products` | PASS: 40 pasaron, 0 fallaron | Cubre reglas puras, almacenamiento, casos de uso, repositorio y comandos. |
| `cargo test ... infrastructure::sqlite::migrations` | PASS: 7 pasaron | Migración 0007, índice único parcial y detección heredada (6 → 7). |
| `cargo test ... modules::sales` | PASS: 5 pasaron | `find_product` devuelve `image_file`. |
| `npx vitest run src/__tests__/modules/catalog/products` | PASS: 21 pasaron (2 archivos) | Máquina de estados del campo y `productImageSource`. |
| `npm run build` | No ejecutado | Falla conocida y ajena a U1 (`tsconfig.json`). |

Verificación diferencial de reglas contra el código:

- **BR1.1 a BR1.4:** `image.rs` y `read_source` validan extensión sin distinguir mayúsculas, firma y tamaño (0 y 5 242 880). La extensión de la copia sigue a la firma detectada, no al nombre.
- **BR2.1 y BR2.5:** la copia se escribe en un temporal y se renombra. El origen solo se lee (`fs::metadata` y `fs::read`). Las pruebas confirman que el original queda intacto y que `inspect` no escribe en disco.
- **BR2.2 a BR2.4:** el orden es validar, copiar, transacción y borrar la copia vieja solo tras confirmar. Si la base falla, se borra la copia nueva. En `delete_product` el borrado va después de `repository.delete`, así que una eliminación rechazada no toca la copia.
- **BR2.6:** `is_valid_image_file_name` exige un UUID v4 en minúsculas y `png`, `jpg` o `webp`. `delete` ignora y registra los nombres inválidos. El patrón de TypeScript es equivalente.
- **BR2.7:** `discard_copy` registra una advertencia y no falla el guardado.
- **BR4.1 y NFR5:** `ALTER TABLE` agrega la columna con valor nulo, el índice único es parcial, y `update` corre en una sola transacción con rollback probado.
- **Alcance del protocolo de archivos:** `protocol-asset` está activo y el alcance se limita a `product-images/**`. La CSP sigue en `null`, como se declaró.
- **Máquina de estados (BR5.1 y BR5.2):** `remove` en una creación vuelve a `empty`. `undo` regresa al cambio anterior. `cancel` descarta lo pendiente. Un error de elección conserva el cambio previo.
- **Rastreabilidad:** los destinos de traceability.json implementan los IDs que declaran. El manifiesto de fuentes no reclama archivos ajenos a la unidad.
- **Pruebas no vacuosas:** las de casos de uso usan dobles que registran llamadas y afirman copias creadas y borradas. Las de repositorio provocan una falla real con el índice único y verifican el rollback.

### Summary

La implementación cumple las reglas BR1.1 a BR5.2 y los criterios revisados. No hay hallazgos Critical ni Major, y las pruebas acotadas pasan. Quedan tres hallazgos Minor: el residuo `.tmp` ante un cierre abrupto, la verificación en ejecución del alcance del protocolo de archivos y la falta de pruebas de componente del campo de imagen.
