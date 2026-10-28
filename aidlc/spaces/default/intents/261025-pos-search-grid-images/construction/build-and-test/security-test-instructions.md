# Instrucciones de pruebas de seguridad

## Objetivo

NFR4 — seguridad de archivos: las operaciones de imagen solo leen el archivo elegido, solo escriben y borran dentro de la carpeta de imágenes de la app, y una referencia guardada no puede apuntar fuera de ella (sin `..`, rutas absolutas ni enlaces simbólicos).

## Pruebas automáticas

```bash
# Reglas puras y almacenamiento: confinamiento, firma, tamaño, extensión
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products

# Frontend: resolución segura de la URL de imagen (separadores, nulo, inválido)
npx vitest run src/__tests__/modules/catalog/products
```

Casos relevantes (de `unit-test-instructions.md` de U1): confinamiento (`../x.png`, ruta absoluta, separadores), firma PNG/JPEG/WebP inválida, extensión no permitida, tamaños 0, 5 242 880 y 5 242 881 bytes, borrar un nombre inválido se ignora, el original elegido por el administrador queda intacto.

## Inyección y entrada

- Las sugerencias comparan texto literal (`%` y `_` no son comodines); lo cubre `matching.rs`.
- Los montos y cantidades usan `decimal.js` y `money.rs` (NFR5); lo cubren las pruebas de `decimalCalculations` y `posReducer`.

## Verificación manual del alcance del protocolo de assets

El proyecto ya registró que en Tauri 2 `$APPDATA` en el alcance de `assetProtocol` equivale a `app_data_dir` y no se repite el identificador de la app. Comprobar en la app corriendo que una imagen de producto se ve (si respondiera 403, el alcance está mal) y que una URL fuera de la carpeta de imágenes no se sirve.

## Sources

- `inception/requirements-analysis/requirements.md` (NFR4, NFR5).
- `construction/product-image/code-generation/unit-test-instructions.md`.
- `aidlc/spaces/default/memory/project.md` (corrección sobre `assetProtocol`).

## Assumptions & Open Questions

- [assumption] No hay herramienta SAST/DAST instalada en el proyecto; las comprobaciones de NFR4 son las pruebas unitarias del almacenamiento que pide el propio requisito.
