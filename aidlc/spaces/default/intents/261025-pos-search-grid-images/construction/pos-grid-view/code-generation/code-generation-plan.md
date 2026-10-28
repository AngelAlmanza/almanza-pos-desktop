# Plan de generación de código — U3 pos-grid-view

## Summary

- Builds: vista de cuadrícula del POS (tarjetas agrupadas por categoría, ordenables y filtradas por la barra), selector de vista con preferencia por sesión de login y carrito compacto.
- Touches: `modules/pos` (utilidades `viewMode.ts` y `productGrid.ts`, hooks `useProductGrid` y `useCartLineActions`, componentes `ProductGrid`, `ProductCard`, `CompactCart`, `ViewModeToggle`), `PosSearchBar`, `SaleSummaryTable`, `POSPage` y `AuthService.logout`.
- Tests: unos 35 de Vitest (agrupado, orden, preferencia de vista, reductor de estados de la cuadrícula y lógica compartida del carrito), con el conjunto existente en verde.

## Alcance y decisiones heredadas

- Unidad: `pos-grid-view` (U3, `ui`). Implementa FR2.1–FR2.12, FR3.1–FR3.5 y AC2.1–AC2.9, AC3.1–AC3.4 según `functional-design/functional-spec.md` y `frontend-components.md`.
- P1 = A (el foco vuelve a la barra tras cada alta), P2 = A (precio base en el carrito compacto), P3 = A (aviso al tocar una tarjeta agotada).
- Proyecto existente (brownfield): se modifican los archivos en su lugar. No se crean duplicados. No hay cambios de backend: la regla de coincidencia ya existe en `suggest_products` (U2) y `get_active_products` ya está expuesto.
- Decisiones de implementación que cierran los hallazgos de la revisión del diseño:
  - El borrado de `pos_view_mode` vive en `AuthService.logout()`, que es lo que llaman tanto `AuthContext.logout` como las ramas de sesión caducada de `refreshUser`; así AC3.2 y FR3.4 se cumplen en las dos rutas.
  - La lógica de las partidas del carrito (`updateQuantity`, cambio de cantidad, eliminar y sus mensajes) se extrae de `SaleSummaryTable` al hook `useCartLineActions`, y `SaleSummaryTable` y `CompactCart` lo comparten. El comportamiento de `SaleSummaryTable` no cambia.
  - El nombre de categoría viene de `Product.category_name` (ya existe en el tipo y en el modelo Rust); el grupo se identifica con `category_id`.
  - El hook `useProductGrid` recorta el texto antes de decidir entre `get_active_products` y `suggest_products`; un texto de solo espacios equivale a texto vacío.
  - La URL de imagen se resuelve una vez en `ProductGrid` (carpeta en memoria) y cada tarjeta recibe la URL; la imagen usa `loading="lazy"` y `decoding="async"`.
  - Al cancelar el diálogo a granel o ante "Producto no encontrado", el foco vuelve a la barra.
  - Contingencia de NFR2: si el montaje de 1 000 tarjetas no cumple 2 s en Build and Test, se aplica `content-visibility: auto` en cada grupo antes de considerar virtualización.

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

Esta unidad no cambia el esquema, no agrega comandos de backend ni acceso a datos nuevo: reutiliza `get_active_products` y `suggest_products`. Las capas "datos", "repositorio" y "API" no aplican. Se omiten sin cambiar la metodología (test-after: implementar cada capa y luego sus pruebas). Las capas "lógica de negocio" y "comportamiento del frontend" son las funciones puras y los hooks/componentes.

## Pasos

### Esqueleto y ejecutores

- [x] **Step 1 — Esqueleto y ejecutor.** Verificar el ejecutor existente: `npx vitest run src/__tests__/modules/pos/utils` (entorno `node`, alias `@modules`; no hace falta configuración nueva). Crear los archivos vacíos de módulo que se llenan en los pasos siguientes: `modules/pos/utils/viewMode.ts` y `modules/pos/utils/productGrid.ts`. Registrar los comandos en `unit-test-instructions.md`. (NFR7)

### Lógica pura (negocio)

- [x] **Step 2 — Preferencia de vista.** `viewMode.ts`: `readViewMode(userId, storage)`, `saveViewMode(userId, mode, storage)` y `clearViewMode(storage)`, con el almacenamiento inyectable y sin lanzar errores hacia la pantalla; clave `pos_view_mode` con `{ userId, viewMode }`. Un valor ausente, de otro usuario, inválido o ilegible devuelve `'list'`. (FR3.1–FR3.5, G9)
- [x] **Step 3 — Pruebas de la preferencia.** Lectura válida, otro usuario, valor inválido, JSON ilegible, almacenamiento que lanza error, guardado y borrado. Correr `npx vitest run src/__tests__/modules/pos/utils/viewMode.test.ts`. (AC3.1–AC3.4)
- [x] **Step 4 — Agrupado y orden.** `productGrid.ts`: `compareNames` (normaliza acentos y mayúsculas), `groupProducts(products)` (grupos por `category_id`, nombre de `category_name`, orden alfabético y "Sin categoría" al final, grupos vacíos omitidos) y `sortProducts(products, key, direction)` (nombre, precio o stock; desempate por nombre y luego por id). (FR2.4, FR2.5, FR2.7, G4, G5)
- [x] **Step 5 — Pruebas de agrupado y orden.** Grupos alfabéticos con acentos, "Sin categoría" al final, producto sin categoría, orden por precio descendente con 10.00, 25.50 y 8.00, stock ascendente, desempate por nombre y por id. Correr `npx vitest run src/__tests__/modules/pos/utils/productGrid.test.ts`. (AC2.2, AC2.3)
- [x] **Step 6 — Reductor de estados de la cuadrícula.** `productGrid.ts`: `gridReducer` con los estados `loading`, `error`, `empty-catalog`, `empty-filter`, `populated`, `refreshing` y `stale`, número de secuencia que descarta respuestas viejas y recorte del texto. (FR2.10, FR2.11, G3, G8)
- [x] **Step 7 — Pruebas del reductor.** Respuesta vigente con productos, vacío del catálogo, vacío por filtro con el texto, respuesta vieja descartada, recarga fallida que conserva las tarjetas, texto de solo espacios equivale a vacío. Correr `npx vitest run src/__tests__/modules/pos/utils/productGrid.test.ts`. (AC2.4, AC2.8, AC2.9)

### Frontend (comportamiento)

- [x] **Step 8 — Borrado en el cierre de sesión.** `AuthService.logout()` llama a `clearViewMode()` además de quitar `pos_session`, envuelto para que un fallo de almacenamiento no impida cerrar sesión. (FR3.4, AC3.2, AC3.3)
- [x] **Step 9 — Lógica compartida del carrito.** Extraer de `SaleSummaryTable.tsx` el hook `modules/pos/hooks/useCartLineActions.ts` (`updateQuantity`, cambio de cantidad, eliminar y sus mensajes de error) y hacer que `SaleSummaryTable` lo use sin cambiar su comportamiento. Las pruebas existentes de `posReducer` deben seguir en verde. (FR2.2)
- [x] **Step 10 — Hook de datos.** `modules/pos/hooks/useProductGrid.ts`: espera de 100 ms, secuencia, `reload()` y estados del reductor; sin texto usa `ProductService.getActive()`, con texto usa `ProductService.suggest(term)` sin límite. (FR2.6, FR2.10, FR2.11, NFR2)
- [x] **Step 11 — Tarjeta, cuadrícula y estados.** `ProductCard.tsx`, `ProductGrid.tsx` (con `GridSortControl` y `GridStatus`): grupos como `section` con encabezado sticky y cuenta, tarjetas como `ButtonBase`, imagen con `loading="lazy"`, `decoding="async"` y placeholder, URL resuelta una vez en la cuadrícula con `productImageSource`, chips "A granel" y "Agotado", aviso de stock atrasado con "Reintentar" y `data-testid`. (FR2.3, FR2.4, FR2.5, FR2.7, FR2.9, FR2.10, NFR2, NFR6)
- [x] **Step 12 — Carrito compacto.** `CompactCart.tsx`: filas de dos líneas con nombre, total, cantidad y precio base, acciones de `useCartLineActions` y foco a la barra al eliminar la última partida. (FR2.2, P2)
- [x] **Step 13 — Selector de vista y barra.** `ViewModeToggle.tsx` y cambios en `PosSearchBar.tsx`: propiedades `viewMode`, `onViewModeChange` y `onTermChange`, manejador `addProduct` por `ref` (relectura, stock, granel; no borra el texto cuando viene de una tarjeta y devuelve el foco a la barra), aviso "Stock insuficiente. Disponible: 0" para el producto agotado, foco a la barra al cancelar el diálogo a granel y ante "Producto no encontrado". Sin cambios en el flujo de Enter ni en el diálogo "Buscar Producto". (FR2.1, FR2.8, FR2.9, FR2.12, NFR3, P1, P3)
- [x] **Step 14 — Integración en `POSPage`.** Estado `viewMode` inicializado con `readViewMode`, `saveViewMode` al cambiar, `suggestionsEnabled` en `false` en cuadrícula, `ProductGrid` y `CompactCart` en cuadrícula, y `salesVersion` que se incrementa tras cobrar. Sin caja abierta conserva el estado actual. (FR2.1, FR2.2, FR2.11, FR3.1–FR3.3)

### Verificación y documentación

- [x] **Step 15 — Verificar la construcción.** Correr `npx vitest run` completo, `npx tsc --noEmit --ignoreDeprecations 5.0` y `cargo check --manifest-path src-tauri/Cargo.toml`. Confirmar que ningún umbral de pruebas ni configuración se relajó. `npm run build` ya falla por la configuración previa de `tsconfig.json` (TS5103), ajena a esta unidad. (NFR7)
- [ ] **Step 16 — Resumen y trazabilidad.** Escribir `code-summary.md`, `traceability.json` y `source-manifest.json` con todas las rutas creadas o modificadas. Comentarios en línea solo donde la razón no sea obvia (foco a la barra, borrado en `AuthService.logout`).

## Trazabilidad de pasos

| Paso | Requisitos y reglas |
|---|---|
| 1 | NFR7 |
| 2, 3 | FR3.1–FR3.5, G9, AC3.1–AC3.4 |
| 4, 5 | FR2.4, FR2.5, FR2.7, G4, G5, AC2.2, AC2.3 |
| 6, 7 | FR2.10, FR2.11, G3, G8, AC2.4, AC2.8, AC2.9 |
| 8 | FR3.4, AC3.2, AC3.3 |
| 9 | FR2.2 |
| 10 | FR2.6, FR2.10, FR2.11, NFR2 |
| 11 | FR2.3–FR2.5, FR2.7, FR2.9, FR2.10, NFR2, NFR6, AC2.6, AC2.7 |
| 12 | FR2.2, P2 |
| 13 | FR2.1, FR2.8, FR2.9, FR2.12, NFR3, P1, P3, AC2.5, AC2.6 |
| 14 | FR2.1, FR2.2, FR2.11, FR3.1–FR3.3, AC2.1 |
| 15, 16 | NFR7 |

## Sources

- `functional-design/functional-spec.md` y `frontend-components.md` (U3) y `functional-design/reviews/review-01.md` (hallazgos de la revisión del diseño).
- `units-generation/unit-of-work.md` (U3) y `requirements-analysis/requirements.md` (FR2, FR3, NFR2, NFR3, NFR6, NFR7).
- Código actual: `src/modules/pos/pages/POSPage.tsx`, `src/modules/pos/components/PosSearchBar.tsx`, `src/modules/pos/components/SaleSummaryTable.tsx`, `src/modules/pos/context/PosProvider.tsx`, `src/modules/auth/services/AuthService.ts`, `src/modules/auth/context/AuthContext.tsx` y `src/modules/catalog/products/services/ProductService.ts`.

## Assumptions & Open Questions

- [assumption] `Product.category_name` y `Product.category_id` están disponibles en los productos activos (`find_active` hace `LEFT JOIN categories`), según la revisión del diseño; si no fuera así se ajusta el comando y se anota en el resumen de código.
- [assumption] El rendimiento de NFR2 con 1 000 productos y 500 imágenes se mide en Build and Test, no en esta unidad.
- [assumption] El proyecto no tiene entorno de DOM; el comportamiento de los componentes se verifica a mano y por la lógica pura.
- Abierta: la validación manual del escaneo justo después de tocar una tarjeta con el lector real (NFR3) queda para Build and Test.
