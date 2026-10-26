# Instrucciones de pruebas — U1 product-image

## Marco y configuración

- Rust: pruebas unitarias en módulos `#[cfg(test)]` dentro de cada archivo, con `cargo test`. No requiere configuración nueva.
- Frontend: Vitest 4 con `environment: 'node'` (`vitest.config.ts`, alias `@modules`). Las pruebas son de lógica pura, sin DOM.
- Las pruebas de almacenamiento usan una carpeta temporal única bajo `std::env::temp_dir()` y la borran al terminar. No se necesita preparación manual.

## Cómo correr las pruebas de esta unidad

Todos los comandos están acotados a U1. No se usa `npm test` ni `cargo test` sin filtro.

```bash
# Rust: slice de productos (reglas, almacenamiento, casos de uso, repositorio, comandos)
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products

# Rust: migración 0007 y detección heredada
cargo test --manifest-path src-tauri/Cargo.toml infrastructure::sqlite::migrations

# Rust: find_product de ventas con image_file
cargo test --manifest-path src-tauri/Cargo.toml modules::sales

# Frontend: lógica del campo de imagen y productImageSource
npx vitest run src/__tests__/modules/catalog/products
```

Comando de verificación del ejecutor (Step 3, antes de agregar pruebas): `npx vitest run src/__tests__/modules/shared/utils/formatCurrency.test.ts`.

## Cobertura esperada

Estrategia Standard: de 5 a 8 pruebas por componente, más pruebas de integración en las fronteras clave. El alcance `refactor` no agrega un mínimo de cobertura. El conjunto existente debe seguir en verde. No se baja ningún umbral.

| Componente | Pruebas | Casos |
|---|---|---|
| Reglas puras (`image.rs`) | 8 | firma PNG, JPEG y WebP; firma inválida; extensión no permitida; tamaños 0, 5 242 880 y 5 242 881; nombre generado; confinamiento (`../x.png`, ruta absoluta, separadores) |
| Almacenamiento (`LocalProductImageStorage`) | 7 | copia correcta con original intacto; extensión según la firma; origen inexistente; archivo vacío; borrar nombre inválido se ignora; borrar archivo ausente no falla; la carpeta se crea si falta |
| Casos de uso (`application.rs`) | 8 | crear con falla de base borra la copia nueva; reemplazar borra la copia vieja; quitar borra la copia; eliminar con ventas no borra; cambio mal formado; `remove` en creación; borrar copia falla y el guardado sigue; `keep` no toca archivos |
| Repositorio SQLite | 6 | crear con imagen; `Set`, `Clear` y `Keep`; transacción revierte; `find_product` de ventas |
| Migración y modelo | 5 | columna nula en productos previos; idempotencia; detección heredada; deserialización de `ImageChange` |
| Máquina de estados del campo | 8 | transiciones de `functional-spec.md`; cancelar descarta; error conserva el cambio previo; `toImageChange` |
| `productImageSource` | 5 | nulo; inválido; válido; separador `\` y `/`; sin carpeta |

## Mocks y datos de prueba

- Casos de uso: repositorio y almacenamiento falsos en memoria que registran las llamadas (cuántas copias se crean y borran).
- Almacenamiento: imágenes mínimas generadas en la prueba con los bytes de firma (PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, WebP `RIFF....WEBP`). No hay archivos binarios en el repositorio.
- Repositorio: SQLite en memoria con el esquema mínimo de la prueba existente más `image_file`.
- Frontend: `convertFileSrc` se inyecta como argumento de `resolveProductImageSource`, así no se necesita Tauri en la prueba.

## Datos y limpieza

Cada prueba de almacenamiento crea su propia carpeta temporal con un UUID y la elimina al final. Ninguna prueba toca la carpeta de datos real de la app ni escribe fuera de `temp_dir()`.

## Sources

- `functional-design/functional-spec.md` (escenarios de prueba), `rules.md` y `entities.md`.
- `code-generation-plan.md` (Testing Contract, pasos 3, 6, 9, 13, 15 y 19).

## Assumptions & Open Questions

- [assumption] `cargo test` con el filtro por ruta de módulo selecciona solo las pruebas de esta unidad; si el nombre de un módulo cambia durante la generación, los comandos se actualizan aquí.
