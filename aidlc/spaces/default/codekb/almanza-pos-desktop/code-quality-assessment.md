# Evaluación de calidad del código — Almanza POS Desktop

## Resumen

| Dimensión | Calificación | Comentario |
|---|---|---|
| Claridad de nombres | Buena | Nombres de dominio consistentes (`create_sale_atomically`, `getRequestedProductQuantityAfterAdd`); mensajes al usuario en español |
| Tamaño de funciones | Regular | Casos de uso Rust compactos; páginas React y adaptador de ventas extensos |
| Manejo de errores | Regular | `AppError` tipado y transacciones en operaciones críticas; pero `.ok()` oculta errores de BD y la UI convierte errores con `String(err)` |
| Presencia de pruebas | Regular | Buena cobertura de lógica monetaria, unidades, reductor y migraciones; nula en componentes, búsqueda e imágenes |
| Duplicación | Regular | Mapeo de `Product` duplicado; formularios y manejo de error repetidos por página |
| Código muerto | Buena | Solo `StockMutationPort`; metadatos genéricos en `Cargo.toml` |

## Pruebas

### Frontend (Vitest 4, entorno `node`)

| Archivo | Casos | Cubre |
|---|---|---|
| `__tests__/modules/pos/context/posReducer.test.ts` | 23 | Alta, fusión, stock, incrementos, cantidades, borrado y limpieza del carrito |
| `__tests__/modules/shared/utils/decimalCalculations.test.ts` | 27 | Totales, USD↔MXN, cambio |
| `__tests__/modules/reports/utils/reportHelpers.test.ts` | 22 | Métricas y filtros de reportes |
| `__tests__/modules/shared/utils/unitConversion.test.ts` | 18 | Conversión de unidades, captura a granel |
| `__tests__/modules/shared/utils/formatCurrency.test.ts` | 8 | Formato de moneda |
| `__tests__/modules/shared/utils/paymentLabels.test.ts` | 6 | Etiquetas de método de pago |
| `__tests__/modules/pos/utils/saleItemPresentation.test.ts` | 3 | Etiquetas de partidas |

Sin jsdom ni Testing Library: **no hay pruebas de componentes** (POSPage, PosSearchBar, ProductsPage). Las funciones puras se prueban bien; añadir pruebas de UI para el intent requiere agregar `jsdom`/`@testing-library/react` o extraer la lógica (filtrado, agrupación, orden) a funciones puras testeables en `node`.

### Backend (`cargo test`, 67 pruebas)

| Ubicación | Pruebas | Cubre |
|---|---|---|
| `shared/money.rs` | 42 | Redondeos, operaciones de dinero/stock, pago mixto, cambio |
| `printer/adapters/escpos.rs` | 6 | Comandos ESC/POS y etiquetas |
| `printer/config.rs` | 5 | Parseo de settings de impresora |
| `infrastructure/sqlite/migrations.rs` | 4 | Idempotencia, registro heredado, checksum, migración fallida |
| `modules/catalog/products/application.rs` | 3 | Validación de granel |
| `printer/ticket_builder.rs` | 2 | Ticket de venta y crédito |
| `modules/sales/adapters/outbound/sqlite.rs` | 2 | Stock a granel y venta fiada (SQLite en memoria) |
| `modules/sales/adapters/inbound/tauri.rs` | 2 | Validación de metadatos de captura |
| `modules/catalog/products/adapters/outbound/sqlite.rs` | 1 | Crear/actualizar `is_bulk` (esquema propio en la prueba) |

Sin pruebas para `search`, `find_active`, settings ni almacenamiento de imágenes. Las pruebas de adaptadores crean esquemas a mano en lugar de aplicar `MIGRATIONS`, por lo que un cambio de columna obliga a actualizar esos esquemas.

### Cobertura
- Script `npm run test:coverage` (v8) disponible, sin umbrales. Sin medición de cobertura en Rust.
- El org default exige que el suite existente siga en verde para el scope `refactor`; no hay piso de cobertura adicional.

## Linting y formato

- No hay `.eslintrc*`, `eslint.config.*` ni `.prettierrc*`; sin embargo `ReportGenerator.ts` contiene 5 `eslint-disable-next-line @typescript-eslint/no-explicit-any` (restos de una configuración previa).
- `tsc` estricto (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) actúa como único verificador en `npm run build`.
- Estilo mixto de comillas (simples y dobles) en TS/TSX pese a la convención declarada en `AGENTS.md`.
- Rust sin `rustfmt.toml`/`clippy.toml`; el código sigue el formato por defecto de `rustfmt` salvo algunas líneas largas en `accounts_receivable` y `sales`.

## CI/CD

- No hay pipelines (`.github/workflows`, etc.). Build y pruebas se ejecutan manualmente.
- El intent declara que no habrá despliegues (prueba de concepto).

## Documentación

- `README.md`: completo y actualizado (características, comandos, arquitectura hexagonal, precisión, pruebas, seguridad).
- `AGENTS.md` / `CLAUDE.md`: la sección Architecture está **desactualizada** (describe `commands/`, `db/schema.rs`, `db/repository/`, `utils/money.rs`, `src/services/`, `src/models/index.ts`, `src/dto/index.ts`); también la nota de memoria del asistente sobre `inventory_repo.rs` con f64 crudo ya no aplica.
- `docs/interface-design/system.md` y `.interface-design/system.md`: sistema de diseño "La Caja" (paleta, bordes, espaciado, componentes) — referencia para las tarjetas de la cuadrícula.
- `docs/analysis/`: análisis de problemas con estado (varios ✅ resueltos); `docs/prd/`: planes de migración hexagonal y modular ya ejecutados; `docs/fixes.md`: errores pendientes (mensajes de error fuera del modal en productos y categorías).

## Deuda técnica

| ID | Hallazgo | Evidencia | Severidad | Relación con el intent |
|---|---|---|---|---|
| TD-01 | Errores de BD convertidos en `None` con `.ok()` | `catalog/products/adapters/outbound/sqlite.rs:126,134`; patrón en todos los adaptadores | Media | Al leer/guardar imagen, un error real podría reportarse como "no encontrado" |
| TD-02 | Actualización parcial sin transacción y sin poder escribir `NULL` | `catalog/products/adapters/outbound/sqlite.rs:181-255`; `models/product.rs:35-47` | Media | Bloquea "quitar imagen" sin diseño explícito |
| TD-03 | Mapeo de `Product` duplicado | `catalog/products/.../sqlite.rs:74-97` y `sales/.../sqlite.rs:138-166` | Baja | Columna nueva = cambios en ambos |
| TD-04 | Sin autorización en backend; `user_id` desde el cliente; token sin validar; `csp: null` | `bootstrap.rs`, `tauri.conf.json` | Media (local) | Nuevos comandos de imagen heredan el modelo |
| TD-05 | Imagen: ruta absoluta guardada, sin validación de tamaño/tipo real, sobrescritura por clave, huérfanos con otra extensión, data URL base64 | `settings/adapters/outbound/filesystem.rs` | Media | Patrón a mejorar antes de replicarlo para productos |
| TD-06 | Búsqueda `LIKE '%term%'` sin índice, sensible a acentos en mayúsculas, límite fijo 20 | `catalog/products/.../sqlite.rs:139-154` | Baja | Sugerencias y filtro de cuadrícula |
| TD-07 | `useCallback` de `handleBarcodeSubmit` con dependencias incompletas (lee `cart` de un cierre) | `PosSearchBar.tsx:67-94` | Baja | Sugerencias tocarán este flujo |
| TD-08 | Archivos grandes | `CashRegisterPage.tsx` 822, `sales/.../sqlite.rs` 811, `POSPage.tsx` 753, `ReportsPage.tsx` 676, `ProductsPage.tsx` 635 | Baja | Agregar la cuadrícula a `POSPage` aumentaría su tamaño; conviene extraer componentes |
| TD-09 | Errores mostrados fuera del modal | `ProductsPage.tsx:249-253`; `docs/fixes.md` | Baja | El formulario de imagen debería mostrar errores dentro del diálogo |
| TD-10 | `closing_amount` suma MXN + USD sin tipo de cambio | `cash_register/adapters/outbound/sqlite.rs` `close_session` | Baja | No |
| TD-11 | Total de abono con `number` en lugar de `decimal.js` | `CustomersPage.tsx:75-80` | Baja | No |
| TD-12 | Filtro por usuario en cliente después de paginar | `SalesPage.tsx` | Baja | No |
| TD-13 | Datos de negocio ficticios en reportes | `reports/constants/Reports.ts:16-22` | Baja | No |
| TD-14 | `Mutex<Connection>` único | `infrastructure/sqlite/database.rs` | Baja | Cargas de muchas imágenes por IPC competirían con otras consultas |
| TD-15 | Documentación de agentes desactualizada | `AGENTS.md` Architecture | Baja | Puede inducir a error a agentes en Construction |
| TD-16 | Sin lint/format/CI | raíz del repo | Media | El org default pide linter en CI; hoy no existe |
| TD-17 | Dependencias redundantes (`moment` + `date-fns`, `@types/jspdf` con jspdf 4) | `package.json` | Baja | No |
| TD-18 | Código muerto `StockMutationPort` | `inventory/application.rs:31` | Baja | No |

## Línea base de pruebas sugerida (brownfield)

Antes de Construction: `npm test` (Vitest) y `cargo test` en `src-tauri/`, registrando totales. No se ejecutaron en esta etapa (escaneo de solo lectura).
