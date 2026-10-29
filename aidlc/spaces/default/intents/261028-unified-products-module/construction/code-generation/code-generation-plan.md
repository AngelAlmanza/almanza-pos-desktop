# Plan de Generación de Código — Módulo de Productos unificado

## Summary

- Builds: un solo módulo "Productos" (listado con estado de stock, resumen, filtros, categorías, ajuste de stock e historial en panel lateral) que reemplaza las pantallas Productos, Categorías e Inventario.
- Touches: `src/modules/catalog/products/` (página, componentes, utilidades), `src/core/layout/Layout.tsx`, `src/core/App.tsx`; se retiran `CategoriesPage` e `InventoryPage`. No se toca `src-tauri/` ni el POS.
- Tests: 8 archivos de pruebas unitarias con Vitest (estado de stock, filtros y conteos, ajuste, permisos, navegación y redirecciones, errores de formulario, recorte de texto, columnas visibles), unos 46 casos.
- Revisión 2 (paso 23): el conteo de cada categoría ya no queda bajo los botones de acción y el título "Estado de stock" va en línea con las pestañas de filtro, alineadas con el resto de los controles.
- Revisión 1 (pasos 17–22): nombre y descripción de la tabla limitados a dos líneas con "…", selector múltiple para mostrar u ocultar columnas (todas visibles por defecto), conteo de categorías en un círculo sin superponerse a editar, y título "Estado de stock" sobre las pestañas de filtro.

## Alcance y decisiones

Fuentes: `inception/requirements-analysis/requirements.md` (FR1–FR10, NFR1–NFR7), `inception/refined-mockups/` (mockups M1–M7, interaction-spec, design-system-mapping) y el código actual de `ProductsPage`, `InventoryPage`, `CategoriesPage` y `Layout`.

- **Solo frontend.** Los comandos existentes (`get_products`, `create_inventory_adjustment`, `get_inventory_adjustments_by_product`, `get_inventory_adjustments_by_date_range`, comandos de categorías) cubren todo; no hay datos nuevos (restricción del intent). Las capas "modelo de datos", "repositorio" y "API" no aplican y no se generan; las pruebas de Rust existentes siguen intactas.
- **Cálculo en el cliente.** El estado de stock, los conteos de categorías y el resumen se derivan de la lista de productos ya cargada (hasta 500, NFR1), con `decimal.js` para comparar y previsualizar stock (regla del proyecto).
- **Permisos en la interfaz** (FR1.3, NFR5): `/products` pasa a ser ruta para cualquier usuario autenticado; el cajero solo ve el listado, filtros, resumen y "Ajustar stock".
- **Rutas antiguas** (FR1.2): `/categories` y `/inventory` redirigen a `/products` (Inventario a la pestaña "Historial de stock" cuando el usuario es administrador).
- **Supuesto heredado:** si "Faltó al contar" deja el stock negativo, se conserva la regla actual del sistema; la vista previa muestra el resultado igual.

## Mapa de trazabilidad (requisito → paso del plan)

| Requisito | Pasos |
|-----------|-------|
| FR1 (navegación y permisos) | 4, 5, 6, 13, 14 |
| FR2 (listado y estado de stock) | 4, 5, 7, 8, 9 |
| FR3, FR4 (alta, edición, activar, eliminar) | 4, 5, 10, 11 |
| FR5 (ajuste de stock) | 4, 5, 6, 8, 12 |
| FR6 (categorías) | 4, 5, 9, 11 |
| FR7 (historial) | 12, 13 |
| FR8, FR9 (resumen y filtros) | 4, 5, 7, 8 |
| FR10 (ficha de producto) | 12 (el panel lateral es la ficha) |
| NFR1 rendimiento | 5, 7 |
| NFR2, NFR3, NFR7 (uso, accesibilidad, idioma) | 7, 8, 9, 12, 17–22 |
| FR2, FR9 (revisión 1: texto largo, columnas, etiqueta del filtro) | 17–22 |
| FR6 (revisión 1: conteo en círculo, sin superposición) | 17, 21 |
| NFR4 integridad (redondeo a 3 decimales) | 4, 5 |
| NFR6 compatibilidad (POS y reportes sin cambios) | 15 |

## Pasos

- [ ] **Step 1: Estructura del módulo.** Crear las carpetas `src/modules/catalog/products/components/` (ya existe), `.../utils/` (ya existe) y `src/__tests__/modules/catalog/products/` (ya existe); sin dependencias nuevas. Sin cambios en `package.json`.
- [ ] **Step 2: Verificar el corredor de pruebas.** Confirmar que `npx vitest run src/__tests__/modules/catalog/products/productImage.test.ts` pasa con la configuración actual (`vitest.config.ts`, entorno `node`) y registrar el comando por unidad en `unit-test-instructions.md`.
- [ ] **Step 3: Datos de navegación.** Crear `src/core/layout/navItems.ts` con las entradas del menú como datos (`label`, `path`, `iconKey`, `adminOnly`) y `getVisibleNavItems(isAdmin)`; "Productos" visible para todos; sin "Categorías" ni "Inventario" (FR1.1, FR1.3).
- [ ] **Step 4: Lógica de negocio pura (implementar).** Crear en `src/modules/catalog/products/utils/`:
  - `stockStatus.ts`: `getStockStatus` (Agotado ≤ 0, Bajo ≤ mínimo, Normal; Inactivo sin estado), `STOCK_STATUS_LABELS`, `summarizeStock`, `filterProducts` (categoría incluida "Sin categoría", estado, inactivos), `countByCategory`, `compareProductsByName` (sin distinguir mayúsculas ni acentos; desempate por id) — FR2.2–FR2.5, FR8, FR9.
  - `stockAdjustment.ts`: `ADJUSTMENT_LABELS` (`add` → "Llegó mercancía", `positive` → "Sobró al contar", `negative` → "Faltó al contar"), `previewAdjustment` (suma/resta con `decimal.js`, 3 decimales), `validateAdjustmentQuantity` (> 0; enteros para productos por pieza; hasta 3 decimales a granel) — FR5.2–FR5.4, FR7.3.
  - `productPermissions.ts`: `getProductPermissions(isAdmin)` con la tabla de FR1.3.
  - `categoryDeletion.ts`: `describeCategoryDeletion(name, productCount)` con singular/plural — FR6.2.
  - `productFormErrors.ts`: `mapProductError(message)` que asigna el error de un dato repetido o inválido al campo (nombre, código de barras, precio) y conserva el resto como aviso general — FR3.3.
- [ ] **Step 5: Lógica de negocio pura (pruebas).** Escribir y ejecutar `stockStatus.test.ts`, `stockAdjustment.test.ts`, `productPermissions.test.ts`, `categoryDeletion.test.ts` y `productFormErrors.test.ts` después de implementar. Incluir la regresión dirigida de los límites del estado de stock (stock = mínimo → Bajo; 5,001 con mínimo 5 → Normal; stock 0 con mínimo 0 → Agotado) y de la vista previa a granel (1,250 − 0,250 = 1,000).
- [ ] **Step 6: Servicios y tipos.** Reutilizar `ProductService`, `CategoryService` e `InventoryService` sin cambios de contrato. Agregar solo tipos locales (`StockStatus`, `ProductFilters`, `ProductPermissions`) en `src/modules/catalog/products/types.ts`. Nombre de usuario del ajuste: `useAuth().user.id`, como hoy.
- [ ] **Step 7: Componentes de listado (implementar).** Crear en `components/`:
  - `StockSummaryCards.tsx` (tres tarjetas; "Stock bajo" y "Agotados" son botones con `aria-pressed`, región `aria-live`, "—" al cargar) — FR8, F2.
  - `CategorySidebar.tsx` (`nav` "Categorías", "Todas", "Sin categoría", conteos, `[+]`/editar/eliminar solo administrador, esqueletos, 200/240 px) — FR6, FR9.
  - `ProductTable.tsx` (columnas de FR2.1, etiqueta de estado con texto y color, columnas Código y Mín. ocultas bajo 1280 px, acciones por fila según permisos, `data-testid` en acciones, estados cargando/vacío/sin resultados/error con "Reintentar"/"Quitar filtros") — FR2, FR4, FR9.2, NFR1.
  - `StockStatusChip.tsx` (colores de `design-system-mapping.md`).
- [ ] **Step 8: Componentes de ajuste (implementar).** `ProductSidePanel.tsx` (`Drawer anchor="right"` como `dialog` modal, 400/440 px, secciones Ajustar e Historial, foco y Escape, regreso del foco al botón de origen), `AdjustmentTypePicker.tsx` (`ToggleButtonGroup` exclusivo con iconos `LocalShipping`, `AddCircleOutline`, `RemoveCircleOutline`; `radiogroup`), vista previa "Ahora → Quedará" con `aria-live`, guardado una sola vez (`saving`), aviso "Ajuste guardado" 5 s — FR5, FR7.2, F1, F3.
- [ ] **Step 9: Diálogos de producto y categoría (implementar).** Extraer `ProductFormDialog.tsx` del `ProductsPage` actual (mismos campos, imagen con `ProductImageField`, categoría preseleccionada, "+ Nueva categoría" en la lista, errores bajo el campo, sin doble guardado) y `CategoryFormDialog.tsx`; la confirmación de eliminar categoría usa `describeCategoryDeletion` con `ConfirmModal` (se amplía `ConfirmModal` con `confirmLabel` y `confirmColor="error"` opcionales, retrocompatible) — FR3, FR6.
- [ ] **Step 10: Historial de stock (implementar).** `StockHistoryTab.tsx` con la lógica de `InventoryPage` (rango de fechas, paginación 25/50/100, nombres nuevos de tipo, "Sin ajustes en estas fechas", error con "Reintentar", clic en el producto abre el panel en Historial) — FR7.
- [ ] **Step 11: Página del módulo (implementar).** Reescribir `ProductsPage.tsx` como orquestador: carga con productos y categorías, pestañas "Productos" / "Historial de stock" (solo administrador), filtros (categoría, estado, "Mostrar inactivos") que se conservan al abrir el panel y al cambiar de pestaña, `useMemo` para listado y conteos, actualización local del producto tras un ajuste sin recargar, activar/desactivar y eliminar con mensaje que sugiere desactivar — FR1–FR10.
- [ ] **Step 12: Rutas y menú (implementar).** `App.tsx`: mover `/products` fuera de `AdminGuard`, agregar `Navigate` desde `/categories` y `/inventory`, quitar las importaciones de `CategoriesPage` e `InventoryPage`. `Layout.tsx`: usar `getVisibleNavItems` y mapear `iconKey` a los iconos existentes. Eliminar `CategoriesPage.tsx` e `InventoryPage.tsx` una vez cubiertas todas las funciones de paridad P1–P11 — FR1.1, FR1.2.
- [ ] **Step 13: Rutas y menú (pruebas).** Escribir y ejecutar `navItems.test.ts` (menú del administrador y del cajero; rutas antiguas redirigen; `getLegacyRedirect`) después de implementar.
- [ ] **Step 14: Comportamiento de la interfaz (verificación).** Comprobar con `npm run build` (compila TypeScript) y revisión manual guiada por `accessibility-checklist.md` y la tabla de paridad P1–P11; los componentes de React quedan fuera de las pruebas automáticas porque el entorno de pruebas es `node` y no se agrega jsdom (decisión: la lógica con reglas vive en funciones puras ya cubiertas en los pasos 5 y 13).
- [ ] **Step 15: Configuración y regresión.** Ejecutar `npm test` (suite completa) y `cargo test` en `src-tauri/` para confirmar que POS, reportes y dinero siguen verdes (NFR6); `data-testid` en las acciones del listado y del panel para pruebas futuras. Sin cambios de configuración de compilación ni de umbrales.
- [ ] **Step 16: Documentación y trazabilidad.** Escribir `code-summary.md`, `traceability.json` (todos los FR/NFR con un archivo `OK` existente) y marcar los pasos de este plan.

### Revisión 1 — ajustes de UI pedidos al rechazar el plan

Cambios solicitados por la persona sobre lo ya construido (solo interfaz, sin datos nuevos). Los pasos 17–22 se construyen sobre el código existente; los pasos 1–16 quedan como están.

- [ ] **Step 17: Utilidades de texto y columnas (implementar).** Crear en `utils/`:
  - `truncateText.ts`: `truncateText(text, max)` que corta en `max` caracteres y agrega "…" (sin cortar si cabe; `max` ≤ 0 devuelve vacío). Se usa para el nombre de categoría (máximo 24 caracteres en la barra lateral; el nombre completo queda en `title` y en el `aria-label`).
  - `columnVisibility.ts`: `PRODUCT_COLUMNS` (Código, Categoría, Unidad, Precio, Stock, Mín., Estado; "Producto" y "Acciones" son fijas y no se pueden ocultar), `ALL_COLUMN_KEYS` (por defecto todas visibles), `toggleColumn(visible, key)` y `normalizeVisibleColumns(keys)` (descarta claves desconocidas y conserva el orden de la tabla).
  - Tipos `ProductColumnKey` en `types.ts`.
- [ ] **Step 18: Utilidades de texto y columnas (pruebas).** Escribir y ejecutar `truncateText.test.ts` y `columnVisibility.test.ts` después de implementar. Incluir la regresión dirigida de los tres defectos: texto largo se corta con "…" (límite exacto sin cortar, un carácter más sí), por defecto todas las columnas visibles, ocultar y volver a mostrar una columna conserva el orden, las columnas fijas no se pueden ocultar.
- [ ] **Step 19: Tabla de productos (implementar).** En `ProductTable.tsx`: columna Producto con ancho máximo definido (`maxWidth` ≈ 320 px, `table-layout` estable); nombre y descripción limitados a dos líneas cada uno con `-webkit-line-clamp: 2` y "…" para el resto, con `title` con el texto completo; nuevo prop `visibleColumns` para mostrar u ocultar cada columna (encabezado y celdas); se retira el ocultamiento automático bajo 1280 px (lo reemplaza el selector); `colSpan` de los mensajes según las columnas visibles; el contenedor de la tabla desplaza en horizontal (`overflow-x: auto`) cuando aun así no cabe.
- [ ] **Step 20: Selector de columnas (implementar).** Crear `ColumnVisibilityMenu.tsx`: control de selección múltiple (`Select multiple` con casillas, etiqueta "Columnas", resumen "N de M columnas") junto a los filtros en `ProductsPage.tsx`; estado `visibleColumns` inicia con todas; fijas deshabilitadas en la lista; `data-testid` por opción.
- [ ] **Step 21: Barra de categorías (implementar).** En `CategorySidebar.tsx`: el conteo de productos va dentro de un círculo con fondo (`Chip`/`Box` redondo de ancho mínimo fijo, número centrado, `aria-label` conservado); se reserva un ancho fijo para las acciones de editar y eliminar (la lista ya no los superpone); el nombre usa `truncateText` (24 caracteres) con `title`; filas "Todas" y "Sin categoría" usan el mismo círculo.
- [ ] **Step 22: Etiqueta del filtro de stock (implementar) y verificación.** En `ProductsPage.tsx`: título visible "Estado de stock" (con `id` enlazado por `aria-labelledby` al grupo) antes de las pestañas de filtro Todos / Normal / Bajo / Agotado, y "Columnas" en el selector nuevo. Verificar con `npm run build`, revisión manual a 1024 px y 1366 px (nombre y descripción muy largos, categoría con nombre largo, columnas ocultas) y `npm test` completo; actualizar `code-summary.md` y `traceability.json` con los archivos nuevos.

### Revisión 2 — alineación visual pedida al rechazar el gate

- [x] **Step 23: Barra de categorías y fila de filtros (implementar).** (a) `CategorySidebar.tsx`: dejar de usar `secondaryAction` (posición absoluta); cada categoría es una fila flex con el botón de la categoría (nombre con "…" + círculo de conteo) a la izquierda y, a su derecha, los botones editar y eliminar en un bloque de ancho fijo fuera del botón, de modo que el conteo nunca quede debajo de las acciones. (b) `ProductsPage.tsx`: el título "Estado de stock:" pasa a estar en línea, a la izquierda de las pestañas de filtro (fila con `alignItems: center`), de modo que las pestañas queden centradas verticalmente con el selector "Columnas" y el interruptor "Mostrar inactivos"; `FormControlLabel` sin margen. Verificación: `npm test` scoped sin cambios de lógica y `tsc --noEmit` (tsconfig temporal); revisión visual pendiente de la persona.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "bugfix",
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
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
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
  "input_sha256": "sha256:734296f7a88d8aa189eebfdcf861c8053ebb1ccf67ac2988fabcdb57707f1982",
  "contract_sha256": "sha256:ff0e124d09df52363fd702db5d680f25984131a5281b88f282d59b045741218f"
}
```
