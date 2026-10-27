# Plan de generación de código — U2 search-suggestions

## Summary

- Builds: sugerencias de búsqueda en vivo bajo la barra del POS (3 o más caracteres, hasta 10 resultados, 3 visibles, teclado y clic), con la regla de coincidencia sin acentos ni mayúsculas en el backend.
- Touches: slice `catalog/products` (Rust: `matching.rs`, caso de uso y comando `suggest_products`), `bootstrap.rs`, `ProductService`, `PosSearchBar` y archivos nuevos del POS (`productSuggestions.ts`, `useProductSuggestions`, `ProductSuggestionList`).
- Tests: unos 30 (Rust: normalización, coincidencia, orden, límite y caso de uso; Vitest: disparo, resaltado, decisión de Enter y reductor de estados), con el conjunto existente en verde.

## Alcance y decisiones heredadas

- Unidad: `search-suggestions` (U2, `ui`). Implementa FR1.1–FR1.12 y AC1.1–AC1.10 según `functional-design/functional-spec.md` y `frontend-components.md`.
- Q1 = B: las sugerencias se calculan en el backend con un comando nuevo. Q2 = B: al elegir una sugerencia se vuelve a leer el producto por id.
- `search_products` (con `LIKE`) no cambia: lo siguen usando Enter y el diálogo "Buscar Producto" (FR1.12).
- Proyecto existente (brownfield): se modifican los archivos en su lugar. No se crean duplicados.
- Fuera de esta unidad: el selector de vista y la cuadrícula (U3). U2 solo expone `suggestionsEnabled` en `PosSearchBar`.
- Decisiones de implementación que cierran los puntos menores de la revisión del diseño:
  - La selección (clic o Enter) cierra la lista e invalida la secuencia de forma síncrona y deja una guarda de "selección en curso" que ignora una segunda selección mientras se relee el producto.
  - Un carácter sin equivalente (`[?]` de `deunicode`) se descarta en el texto y en los campos comparados.
  - `PosSearchBar` guarda en un `ref` el último mensaje de error y su temporizador; un mensaje nuevo cancela el temporizador anterior y el mismo mensaje no se repite mientras siga visible.
  - Tras agregar un producto solo se limpia `barcodeInput` si el texto no cambió desde que se eligió la sugerencia.
  - El `ClickAwayListener` cubre el campo y el contenedor `listbox`.

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

Esta unidad no cambia el esquema ni agrega acceso a datos nuevo: reutiliza `find_active`. Las capas "datos" y "repositorio" no aplican. Se omiten sin cambiar la metodología (test-after: implementar cada capa y luego sus pruebas).

## Pasos

### Esqueleto y ejecutores

- [x] **Step 1 — Esqueleto de módulos y ejecutores.** Crear `modules/catalog/products/matching.rs` (reglas puras) y declararlo en `products/mod.rs`. Verificar los ejecutores existentes: `cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products` y `npx vitest run src/__tests__/modules/pos/utils` (el entorno `node` y el alias `@modules` ya funcionan; no hace falta configuración nueva). Registrar los comandos en `unit-test-instructions.md`. (NFR7)

### Backend (Rust)

- [x] **Step 2 — Reglas de coincidencia.** `matching.rs`: `fold(text)` (recorta, translitera con `deunicode`, descarta `[?]`, pasa a minúsculas), `matches(product, folded_term)` (subcadena literal en nombre o código; `%` y `_` no son comodines; solo productos activos) y `rank(products, term, limit)` (primero los que empiezan con el texto, luego el resto, cada bloque por nombre normalizado; `limit` ausente devuelve todos y `0` devuelve vacío). (FR1.2, FR1.3, L2)
- [x] **Step 3 — Pruebas de las reglas.** Normalización (acentos, `ñ`, mayúsculas, `[?]`), coincidencia por nombre y por código, `%` y `_` literales, solo activos, orden de "empieza con", límite y límite 0, texto vacío. Correr `cargo test ... modules::catalog::products::matching`. (AC1.1, AC1.3)
- [x] **Step 4 — Caso de uso.** `application.rs`: `suggest_products(repository, term, limit)` que lee `find_active`, aplica `rank` y devuelve los `Product` completos; texto vacío tras recortar devuelve lista vacía. Pruebas con el repositorio falso del módulo (`suggest_tests`): solo activos, orden, límite, vacío y error del repositorio propagado. Correr `cargo test ... modules::catalog::products::application::suggest_tests`.
- [x] **Step 5 — Comando Tauri.** `adapters/inbound/tauri.rs`: `suggest_products(db, term: String, limit: Option<usize>)` y registro en `bootstrap.rs`. Prueba de la frontera: serialización del `limit` ausente y presente. Correr `cargo check --manifest-path src-tauri/Cargo.toml` y `cargo test ... modules::catalog::products::adapters::inbound`. (NFR1)

### Frontend (TypeScript)

- [x] **Step 6 — Servicio.** `ProductService.suggest(term, limit?)` llama a `suggest_products` con `{ term, limit }`.
- [x] **Step 7 — Lógica pura.** `modules/pos/utils/productSuggestions.ts`: `shouldSuggest`, `nextHighlight`, `decideEnter(highlightedIndex, listOpen, status)`, `isOutOfStock` y `suggestionsReducer` con secuencia (descarta respuestas viejas). Sin DOM. (L1, L4, L5, FR1.6, FR1.11)
- [x] **Step 8 — Hook.** `modules/pos/hooks/useProductSuggestions.ts`: espera de 200 ms, número de secuencia, estado de la lista, `closeAndInvalidate()` y mensaje para la región en vivo. Al desmontarse invalida la secuencia. (FR1.1, NFR1)
- [x] **Step 9 — Lista.** `modules/pos/components/ProductSuggestionList.tsx`: `Popper` bajo el campo, `listbox` de 3 filas visibles con scroll y `onMouseDown` con `preventDefault()` en todo el contenedor, filas `option` con nombre, código, precio, stock y chips "A granel" y "Agotado", estado `loading` con solo la barra de progreso y fila "Sin coincidencias". Con `data-testid`. (FR1.3, FR1.4, FR1.8, FR1.9, NFR6)
- [x] **Step 10 — Integración en `PosSearchBar`.** Campo como combobox con sus atributos `aria-*`, teclado según la tabla (↓, ↑, Esc, Tab, Enter), `closeAndInvalidate()` síncrono al enviar el formulario de Enter y al elegir, selección con relectura (`getById`), guarda de selección en curso, mensajes de agotado y de producto no encontrado, limpieza de `barcodeInput` al agregar (también tras el diálogo a granel y solo si el texto no cambió), propiedad `suggestionsEnabled`, dependencias completas del `useCallback` de envío y el efecto de foco por cambio de carrito intacto. Sin cambios en el flujo de Enter ni en el diálogo "Buscar Producto". (FR1.5–FR1.8, FR1.10, FR1.12, NFR3)
- [x] **Step 11 — Pruebas del frontend.** `src/__tests__/modules/pos/utils/productSuggestions.test.ts`: disparo con 2 y 3 caracteres y espacios, resaltado (↓, ↑, tope, reinicio al cambiar el texto), decisión de Enter (con resaltado, sin resaltado, en `loading`, con lista cerrada), reductor con respuesta vieja descartada y borrado del texto, y `isOutOfStock` con stock 0 y negativo. Correr `npx vitest run src/__tests__/modules/pos/utils/productSuggestions.test.ts`. (AC1.2, AC1.4, AC1.5, AC1.6, AC1.8, AC1.10)

### Verificación y documentación

- [x] **Step 12 — Verificar la construcción.** Correr `cargo check`, la suite Rust completa, `npx vitest run` completo y `npx tsc --noEmit --ignoreDeprecations 5.0`. Confirmar que ningún umbral de pruebas ni configuración se relajó. `npm run build` ya falla por la configuración previa de `tsconfig.json` (TS5103), ajena a esta unidad. (NFR1, NFR7)
- [ ] **Step 13 — Resumen y trazabilidad.** Escribir `code-summary.md`, `traceability.json` y `source-manifest.json` con todas las rutas creadas o modificadas. Comentarios en línea solo donde la razón no sea obvia (cierre síncrono de Enter, guarda de selección).

## Trazabilidad de pasos

| Paso | Requisitos y reglas |
|---|---|
| 1 | NFR7 |
| 2, 3 | FR1.2, FR1.3, AC1.1, AC1.3, L2 |
| 4, 5 | FR1.2, FR1.3, NFR1 |
| 6, 7, 8 | FR1.1, FR1.5, FR1.6, FR1.11, NFR1, L1, L4, L5 |
| 9 | FR1.3, FR1.4, FR1.8, FR1.9, NFR6 |
| 10 | FR1.5–FR1.8, FR1.10, FR1.12, NFR3, NFR6 |
| 11 | AC1.2, AC1.4, AC1.5, AC1.6, AC1.8, AC1.10 |
| 12, 13 | NFR7 |

## Sources

- `functional-design/functional-spec.md` y `frontend-components.md` (U2).
- `units-generation/unit-of-work.md` (U2) y `requirements-analysis/requirements.md` (FR1, NFR1, NFR3, NFR6, NFR7).
- Código actual: `src/modules/pos/components/PosSearchBar.tsx`, `src/modules/catalog/products/services/ProductService.ts`, `src-tauri/src/modules/catalog/products/` (`application.rs`, `adapters/inbound/tauri.rs`), `src-tauri/src/bootstrap.rs` y `printer/utils.rs` (uso de `deunicode`).

## Assumptions & Open Questions

- [assumption] El repositorio falso de las pruebas de `application.rs` se extiende con productos activos e inactivos; `find_active` sigue siendo el único acceso a datos.
- [assumption] Las pruebas de la frontera del comando se limitan a la serialización del `limit`, porque el ejecutable de prueba con la característica `test` de Tauri no arranca en Windows.
- [assumption] El rendimiento de NFR1 con 5 000 productos se mide en Build and Test, no en esta unidad.
- Abierta: la validación manual del combobox con el lector de código de barras real (NFR3) queda para Build and Test, porque el proyecto no tiene entorno de DOM para pruebas de componente.
