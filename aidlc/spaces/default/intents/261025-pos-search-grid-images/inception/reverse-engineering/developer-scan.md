# Escaneo de código del desarrollador — almanza-pos-desktop

> Escaneo completo (primera pasada, sin store previo) realizado el 2026-10-25 sobre el commit `ea55538fcc3aa8e7871474bf6d02bb60a0081f6b` (rama `main`, con archivos no rastreados solo en `docs/`, `.interface-design/` y el workspace `aidlc/`).

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `./` (repositorio completo, código escrito por personas)
  - `package.json`, `package-lock.json` (versiones resueltas), `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`
  - `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` (versiones resueltas), `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/build.rs`
  - `src-tauri/src/` completo: `bootstrap.rs`, `lib.rs`, `main.rs`, `constants.rs`, `infrastructure/sqlite/` (incluidas las 6 migraciones SQL), `models/`, `shared/`, `modules/` (los 9 slices: identity, catalog/products, catalog/categories, inventory, sales, cash_register, accounts_receivable, settings, printing), `printer/`
  - `src/` completo: `core/`, `modules/` (auth, cash-register, catalog/{products,categories,inventory}, customers, pos, reports, sales, settings, shared, users), `__tests__/`
  - Lectura línea a línea de las áreas que toca el intent: `src/modules/pos/**`, `src/modules/catalog/products/**`, `src/modules/catalog/categories/**`, `src/modules/settings/**` (patrón de imagen), `src-tauri/src/modules/catalog/**`, `src-tauri/src/modules/settings/**`, `src-tauri/src/models/product.rs`, migraciones y `migrations.rs`
  - En las páginas grandes ajenas al intent (`CashRegisterPage`, `SalesPage`, `ReportsPage`, `InventoryPage`, `CustomersPage`, `UsersPage`, `Layout`) se leyó a fondo el estado, los manejadores y las llamadas a servicios; el JSX puramente presentacional se recorrió por estructura.
- **Skimmed only**:
  - `docs/analysis/`, `docs/prd/` (se leyeron encabezados y estado de hallazgos)
  - `docs/interface-design/system.md`, `.interface-design/system.md` (sistema de diseño, por encabezados)
  - `README.md` (arquitectura y comandos)
  - `src-tauri/icons/`, `public/`, `src/assets/` (recursos binarios/estáticos)
  - `.vscode/extensions.json`, `skills-lock.json`
- **Left out**:
  - `node_modules/` (dependencias)
  - `dist/` (salida de build de Vite)
  - `src-tauri/target/` (salida de Cargo)
  - `src-tauri/gen/` (esquemas generados por Tauri)
  - `.claude/`, `.agents/`, `aidlc/` (instalación y workspace de AI-DLC / skills de agentes; excluidos por la instrucción)

### Packages Found
- `almanza-pos-desktop` (npm) — aplicación SPA — TypeScript/React — interfaz de escritorio del punto de venta
- `almanza-pos-desktop` (Cargo, lib `almanza_pos_desktop_lib` + bin) — backend de escritorio Tauri — Rust — lógica de negocio, SQLite, impresión ESC/POS

### Build System
- **Type**: npm + Vite 7 (frontend) y Cargo + tauri-build (backend); orquestados por `@tauri-apps/cli` 2
- **Config Files**: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`
- **Build Dependencies**: `tauri build` → ejecuta `npm run build` (`tsc && vite build` → `dist/`) → empaqueta `dist/` como `frontendDist` del binario Rust. `tauri dev` → `npm run dev` (Vite en puerto fijo 1420).

### APIs Discovered
- Tauri IPC (`#[tauri::command]`) — `src-tauri/src/modules/*/adapters/inbound/*.rs`, registrados en `src-tauri/src/bootstrap.rs` — 58 comandos
- Servicios frontend que envuelven `invoke()` — `src/modules/**/services/*.ts` — 11 clases estáticas (Auth, User, Product, Category, Inventory, Sale, CashRegister, Customer, Setting, Printer) que cubren los 58 comandos (`CategoryService.getById` y `ProductService.getActive` no tienen consumidores en la UI)
- Puertos internos (traits Rust) — `src-tauri/src/modules/*/application.rs` — 17 traits de puerto (repositorios, unit of work, almacenamiento de imágenes, impresora)
- No hay API HTTP ni red externa (aplicación local; solo PowerShell `Get-Printer` y puertos serie para impresoras)

### Frameworks & Libraries
- Tauri — 2.10.2 (crate) / `@tauri-apps/api` 2.10.1 — runtime de escritorio e IPC
- tauri-plugin-dialog — 2.6.0 (crate y npm) — selector de archivos y diálogo de guardado
- tauri-plugin-fs — 2.4.5 (crate y npm) — escritura de reportes exportados
- tauri-plugin-opener — 2 (npm 2.5.3) — abrir archivos exportados
- rusqlite — 0.31.0 (SQLite embebido, feature `bundled`) — persistencia
- bcrypt 0.15, uuid 1, serde 1.0.228, tokio 1.49.0, async-trait 0.1, serialport 4.5, deunicode 1.6, windows 0.61 — auth, tokens, serialización, async, impresión
- React 19.2.4 + react-dom — UI
- MUI `@mui/material` 7.3.8, `@mui/icons-material` 7.3.7, `@mui/x-date-pickers` 8.27.0, Emotion 11 — componentes y estilos
- react-router-dom 7.13.0 — enrutamiento
- decimal.js 10.6.0 — aritmética monetaria y de cantidades
- exceljs 4.4.0, jspdf 4.2.0, jspdf-autotable 5.0.7 — exportación de reportes
- moment 2.30.1, date-fns 4.1.0 — fechas (dos librerías en paralelo)
- Vite 7.3.1, Vitest 4.0.18, TypeScript 5.8.3, `@vitest/coverage-v8` 4 — build y pruebas

### Test Coverage
- **Test Directories**: `src/__tests__/modules/**` (frontend); módulos `#[cfg(test)]` en línea dentro de `src-tauri/src/**` (backend)
- **Test Frameworks**: Vitest 4 (entorno `node`, sin jsdom ni Testing Library); `cargo test` (pruebas unitarias e integración ligera con SQLite en memoria)
- **Coverage Config**: script `npm run test:coverage` con `@vitest/coverage-v8`; sin umbrales configurados. Sin cobertura para Rust.
- **Volumen**: 7 archivos de prueba frontend (~107 casos `it`/`test`: posReducer 23, decimalCalculations 27, reportHelpers 22, unitConversion 18, formatCurrency 8, paymentLabels 6, saleItemPresentation 3); 67 `#[test]` en Rust (money 42, escpos 6, printer config 5, migraciones 4, product application 3, ticket_builder 2, sales sqlite 2, sales tauri 2, products sqlite 1).
- **Huecos**: no hay pruebas de componentes React (POS, búsqueda, formularios), ni de `search_products`, ni del almacenamiento de imágenes de settings.

### Code Quality Indicators
- **Linting**: no hay configuración de ESLint ni Prettier en el repositorio (aunque `ReportGenerator.ts` contiene 5 comentarios `eslint-disable`); el control lo hace `tsc` en modo `strict` con `noUnusedLocals/Parameters`. En Rust no hay `rustfmt.toml` ni `clippy.toml` (se asume `cargo fmt` por defecto).
- **CI/CD**: no se encontraron pipelines (no existe `.github/workflows/` ni equivalentes).
- **Documentation**: `README.md` actualizado y fiel a la arquitectura hexagonal; `AGENTS.md`/`CLAUDE.md` describen una estructura antigua (ver deuda técnica). Comentarios de código escasos pero precisos; mensajes de error al usuario en español.

### Technical Debt Signals
- `AGENTS.md` sección Architecture desactualizada: menciona `src-tauri/src/commands/`, `db/schema.rs`, `db/repository/`, `utils/money.rs`, `src/services/`, `src/models/index.ts`, `src/dto/index.ts`, `src/context/`, `src/guards/`; la estructura real es `modules/<slice>/{application.rs,adapters/}` y `src/modules/**`. La nota de memoria sobre `inventory_repo.rs` con f64 crudo también quedó obsoleta: `inventory/adapters/outbound/sqlite.rs:157-167` ya usa `round3`/`add_stock`/`sub_stock`.
- Las búsquedas por id/clave usan `.ok()` y convierten cualquier error de SQLite en `None` (p. ej. `catalog/products/adapters/outbound/sqlite.rs:126`, `:134`; patrón repetido en todos los adaptadores).
- Las actualizaciones parciales (`update` en products, categories, users) ejecutan un `UPDATE` por campo sin transacción, y la semántica `Option = no cambiar` impide limpiar campos anulables (`description`, `barcode`, `category_id`).
- Mapeo de `Product` duplicado: `catalog/products/adapters/outbound/sqlite.rs:74-97` y `sales/adapters/outbound/sqlite.rs:138-166` (más fixtures que construyen `Product` en `sales/adapters/inbound/tauri.rs:76-93`).
- `cash_register/adapters/outbound/sqlite.rs` `close_session`: `closing_amount = closing_cash_mxn + closing_cash_usd` sin tipo de cambio.
- `CustomersPage.tsx:75-80` calcula el total del pago con aritmética `number` en lugar de `decimal.js` (contradice la convención del proyecto).
- `SalesPage.tsx` filtra por usuario en el cliente después de paginar en el servidor (totales y páginas inconsistentes).
- `reports/constants/Reports.ts:16-22` usa datos de negocio ficticios (`BUSINESS_INFO`) en lugar de los settings `business_*`.
- Seguridad: `tauri.conf.json` con `csp: null`; los comandos no verifican rol en backend (solo guards de UI) y reciben `user_id` del cliente; el token UUID de login nunca se valida.
- `Mutex<Connection>` único serializa todo acceso a la base.
- Archivos grandes con varias responsabilidades: `CashRegisterPage.tsx` (822 líneas), `sales/adapters/outbound/sqlite.rs` (811), `POSPage.tsx` (753), `ReportsPage.tsx` (676), `ProductsPage.tsx` (635).
- Código muerto: trait `StockMutationPort` con `#[allow(dead_code)]` (`inventory/application.rs:31`).
- Metadatos genéricos en `Cargo.toml` (`description = "A Tauri App"`, `authors = ["you"]`); `@types/jspdf` innecesario con jspdf 4; `moment` y `date-fns` conviven.
- Errores de formularios mostrados fuera del modal (registrado por el equipo en `docs/fixes.md`).

## Handoff Summary
- **Intent-relevant finding**:
  - **Búsqueda actual (sin sugerencias en vivo)**: `src/modules/pos/components/PosSearchBar.tsx:67-94` — al enviar (Enter) llama `find_product_by_barcode` (coincidencia exacta, solo activos); si falla, `search_products`; 1 resultado se agrega, >1 abre el modal "Buscar Producto", 0 muestra error. `search_products` (`catalog/products/adapters/outbound/sqlite.rs:139-154`) hace `LIKE '%term%'` sobre `name` o `barcode` (contiene, no prefijo), solo activos, `ORDER BY p.name LIMIT 20` (`constants.rs:8`), sin índice sobre `name`. No hay debounce, autocompletado ni caché. El input de escaneo recupera el foco en cada cambio del carrito (`PosSearchBar.tsx:96-100`), de lo que depende el flujo con lector de código de barras.
  - **Vista de cuadrícula**: no existe. El comando `get_active_products` (`catalog/products/adapters/inbound/tauri.rs:14-17`) ya devuelve todos los productos activos con `category_name`, ordenados por nombre, pero el POS no lo usa (`ProductService.getActive` sin consumidores). `category_id` es anulable (requiere grupo "Sin categoría"). `PosProvider` solo envuelve la ruta `/pos` (`src/core/App.tsx:40-42`), así que su estado se pierde al navegar; no se usa `sessionStorage` en ningún lugar (solo `localStorage` para la sesión de login en `AuthService.ts:7`).
  - **Imágenes de producto**: la tabla `products` no tiene columna de imagen (`migrations/0001_initial.sql:17-30`, `0005`), ni `Product` (Rust `models/product.rs`, TS `catalog/products/types.ts`). La siguiente migración sería `0007_*.sql` registrada en `MIGRATIONS` (`migrations.rs:9-34`). Patrón reutilizable: `settings` define el puerto `SettingsImageStorage` (`settings/application.rs:18-21`) y el adaptador `LocalSettingsImageStorage` (`settings/adapters/outbound/filesystem.rs`) que copia el archivo con `std::fs::copy` a `<app_data_dir>/resources/<key>.<ext>`, guarda la ruta absoluta y devuelve un data URL base64; el frontend usa `open()` de `@tauri-apps/plugin-dialog` con filtros png/jpg/jpeg/webp/gif/svg (`SettingsPage.tsx:144-162`) y `ImageField.tsx` (sin botón de quitar).
  - **Plugins/permisos**: `tauri-plugin-dialog` 2.6.0 y `tauri-plugin-fs` 2.4.5 ya registrados (`bootstrap.rs:16-18`); capability `default.json` concede `dialog:default`, `fs:default` y escritura en `$DOWNLOAD/**` y `$HOME/**`. El protocolo de assets (`convertFileSrc`) NO está habilitado (`tauri.conf.json` sin `assetProtocol`, `csp: null`).
- **Risks / follow-up**:
  - Para "quitar imagen", `UpdateProductRequest` necesita una semántica explícita de borrado (p. ej. bandera `remove_image` o comando dedicado): hoy `None` significa "no cambiar" y no puede escribir `NULL`.
  - Agregar una columna a `products` obliga a actualizar los 3 puntos de mapeo (`row_to_product` + `SELECT_QUERY`, `find_product` en sales, fixtures de pruebas) y el esquema de prueba en `catalog/products/adapters/outbound/sqlite.rs:294-324`.
  - Servir imágenes como data URL base64 por producto escala mal en una cuadrícula con cientos de productos; evaluar protocolo de assets con alcance limitado a `$APPDATA/**` o un comando de miniaturas.
  - El patrón de settings no valida tamaño ni tipo real del archivo, sobrescribe por clave y deja huérfanos los archivos con otra extensión; replicarlo tal cual hereda esos riesgos.
  - El dropdown de sugerencias no debe romper el flujo Enter del lector de código de barras ni el modal de coincidencias múltiples (requisito explícito del intent).
  - `LIKE` de SQLite solo ignora mayúsculas en ASCII; búsquedas con acentos (á, é, ñ) distinguen mayúsculas.
