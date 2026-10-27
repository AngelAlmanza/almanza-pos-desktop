# Instrucciones de pruebas — U2 search-suggestions

## Marco y configuración

- Rust: pruebas unitarias en módulos `#[cfg(test)]` dentro de cada archivo, con `cargo test`. No requiere configuración nueva.
- Frontend: Vitest 4 con `environment: 'node'` (`vitest.config.ts`, alias `@modules`). Las pruebas son de lógica pura, sin DOM; el componente y el hook se verifican a mano con la app corriendo.
- Ninguna prueba toca la base de datos real: el caso de uso usa un repositorio falso en memoria.

## Cómo correr las pruebas de esta unidad

Todos los comandos están acotados a U2. No se usa `npm test` ni `cargo test` sin filtro.

```bash
# Rust: reglas de coincidencia (normalización, coincidencia, orden, límite)
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products::matching

# Rust: caso de uso suggest_products con repositorio falso
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products::application::suggest_tests

# Rust: frontera del comando (serialización del límite)
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products::adapters::inbound

# Frontend: lógica pura de las sugerencias
npx vitest run src/__tests__/modules/pos/utils/productSuggestions.test.ts
```

Comando de verificación del ejecutor (Step 1, antes de agregar pruebas): `npx vitest run src/__tests__/modules/pos/utils`.

## Cobertura esperada

Estrategia Standard: de 5 a 8 pruebas por componente, más pruebas en las fronteras clave. El alcance `refactor` no agrega un mínimo de cobertura. El conjunto existente debe seguir en verde. No se baja ningún umbral.

| Componente | Pruebas | Casos |
|---|---|---|
| Reglas de coincidencia (`matching.rs`) | 8 | acentos y `ñ`; mayúsculas; `[?]` descartado; coincidencia por nombre y por código; `%` y `_` literales; solo activos; "empieza con" antes que "contiene"; texto vacío |
| Caso de uso `suggest_products` | 6 | límite 10; límite 0; sin límite devuelve todos; solo activos; texto vacío tras recortar; error del repositorio se propaga |
| Frontera del comando | 2 | `limit` ausente; `limit` presente |
| `shouldSuggest` y `isOutOfStock` | 4 | 2 y 3 caracteres; espacios al inicio y al final; stock 0; stock negativo |
| `nextHighlight` | 4 | ↓ desde ninguno; ↓ se detiene en la última; ↑ en la primera quita el resaltado; lista vacía |
| `decideEnter` | 4 | con resaltado en `ready`; sin resaltado; en `loading`; con lista cerrada |
| `suggestionsReducer` | 5 | respuesta vigente con resultados; sin resultados; respuesta vieja descartada; texto corto vuelve a `idle`; falla pasa a `error` |

## Mocks y datos de prueba

- Rust: repositorio falso en memoria con productos activos e inactivos, con y sin código de barras, con nombres con acento y con `ñ`. Es el mismo patrón de las pruebas existentes de `application.rs`.
- Frontend: sin mocks de Tauri; las funciones puras reciben datos literales y `Product` mínimos construidos en la prueba.

## Verificación manual (Build and Test)

No hay entorno de DOM, así que estos puntos se confirman con la app corriendo y un lector de código de barras o escribiendo rápido: sugerencias desde 3 caracteres, 3 filas visibles con scroll por ratón y rueda, Enter con y sin fila resaltada, escaneo con sugerencias abiertas, producto agotado y a granel, y la medición de NFR1 con 5 000 productos.

## Datos y limpieza

Las pruebas no crean archivos ni escriben en la carpeta de datos de la app.

## Sources

- `functional-design/functional-spec.md` y `frontend-components.md` (pruebas previstas).
- `code-generation-plan.md` (Testing Contract, pasos 1, 3, 4, 5 y 11).

## Assumptions & Open Questions

- [assumption] El filtro `cargo test` por ruta de módulo selecciona solo las pruebas de esta unidad; si un nombre de módulo cambia durante la generación, los comandos se actualizan aquí.
