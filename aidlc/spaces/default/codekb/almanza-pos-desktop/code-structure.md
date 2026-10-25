# Estructura del código — Almanza POS Desktop

Tamaño aproximado: ~18 600 líneas de código fuente escrito por personas (≈7 300 Rust/SQL, ≈11 300 TS/TSX incluidas pruebas). El inventario detallado de componentes está en `component-inventory.md`; aquí se describe la organización, la clasificación de archivos y los patrones.

## Árbol del repositorio

```text
almanza-pos-desktop/
├── index.html, package.json, vite.config.ts, vitest.config.ts, tsconfig*.json
├── public/                     # recursos estáticos de Vite
├── docs/                       # interface-design, análisis, PRDs de migración, fixes pendientes
├── src/                        # SPA React (TypeScript)
│   ├── main.tsx                # ReactDOM.createRoot + StrictMode
│   ├── core/                   # App (rutas), theme MUI, Layout, guards
│   ├── modules/
│   │   ├── auth/               # AuthContext, AuthService, LoginPage
│   │   ├── pos/                # POSPage, PosSearchBar, SaleSummaryTable, BulkQuantityDialog, PosProvider
│   │   ├── catalog/
│   │   │   ├── products/       # ProductsPage, ProductService, types, constants/Units
│   │   │   ├── categories/     # CategoriesPage, CategoryService, types
│   │   │   └── inventory/      # InventoryPage, InventoryService, types
│   │   ├── sales/              # SalesPage, SaleService, types
│   │   ├── cash-register/      # CashRegisterPage, SumaryCard, CashRegisterService
│   │   ├── customers/          # CustomersPage, CustomerService
│   │   ├── users/              # UsersPage, UserService
│   │   ├── reports/            # ReportsPage, MetricCard, ReportGenerator (PDF/Excel), helpers
│   │   ├── settings/           # SettingsPage, SettingRow, ImageField, PrinterSettingsCard, services
│   │   └── shared/             # ConfirmModal, tipos base, money, unitConversion, formatters, TicketPrinter
│   └── __tests__/modules/      # pruebas Vitest espejo de modules/
└── src-tauri/                  # núcleo Rust
    ├── Cargo.toml, build.rs, tauri.conf.json, capabilities/default.json, icons/
    └── src/
        ├── main.rs → lib.rs → bootstrap.rs   # arranque, plugins, registro de comandos
        ├── constants.rs                       # paginación y límite de búsqueda POS
        ├── infrastructure/sqlite/             # Database, migrations.rs, migrations/000N_*.sql
        ├── models/                            # structs serde (Product, Sale, Category, ...)
        ├── shared/                            # error.rs, money.rs, pagination.rs
        ├── modules/<slice>/                   # application.rs + adapters/{inbound,outbound}
        └── printer/                           # config, hardware (USB/spooler), ESC/POS, ticket_builder
```

## Clasificación de archivos

| Categoría | Backend (Rust) | Frontend (TS/TSX) |
|---|---|---|
| Model/Entity | `models/*.rs` (8 archivos); DTOs `Create*/Update*Request` en el mismo archivo | `modules/**/types.ts`, `modules/shared/types/*.ts` |
| Controller/Handler | `modules/*/adapters/inbound/*.rs` (10 archivos, 58 comandos) | `pages/*.tsx` (12 páginas) actúan como controlador de UI |
| Service/UseCase | `modules/*/application.rs` (9) | `context/PosProvider.tsx` (reductor del carrito), `modules/reports/utils/ReportGenerator.ts` |
| Repository/DAO | `modules/*/adapters/outbound/sqlite.rs` (9), `settings/.../filesystem.rs`, `printing/.../escpos.rs` | `modules/**/services/*.ts` (puerta IPC) |
| Utility/Helper | `shared/money.rs`, `printer/utils.rs` | `shared/utils/{money,unitConversion,FormatCurrency,PaymentLabels,CleanError,TicketPrinter}.ts`, `pos/utils/saleItemPresentation.ts`, `reports/utils/*Helpers.ts` |
| Configuration | `bootstrap.rs`, `constants.rs`, `tauri.conf.json`, `capabilities/default.json`, `Cargo.toml` | `core/App.tsx`, `core/theme.ts`, `vite.config.ts`, `tsconfig.json`, `settings/constants`, `reports/constants`, `catalog/products/constants/Units.ts` |
| Middleware | — (no hay middleware IPC) | `core/guards/AuthGuard.tsx` (`AuthGuard`, `AdminGuard`, `GuestGuard`) |
| Test | módulos `#[cfg(test)]` en línea (67 pruebas) | `src/__tests__/**` (7 archivos) |
| Migration | `infrastructure/sqlite/migrations/0001…0006_*.sql` + `migrations.rs` | — |
| Static/Asset | `icons/` | `public/`, `src/assets/` |

## Patrones de código

### Backend
- **Slice hexagonal**: `application.rs` expone funciones libres `fn caso(repo: &impl Puerto, request) -> AppResult<T>` y define los traits de puerto; los adaptadores SQLite son structs con préstamo `SqliteXRepository<'db> { db: &'db Database }` creados por cada comando.
- **Comandos delgados**: `#[tauri::command] pub fn x(db: State<Database>, request: XRequest) -> AppResult<T> { application::x(&SqliteXRepository::new(&db), request) }`. Los comandos de impresión son `async`.
- **Errores**: `AppError` + `AppResult<T>`; `From<rusqlite::Error>`, `From<bcrypt::BcryptError>`, `From<PoisonError>`; se serializan como texto en español.
- **SQL**: constantes `SELECT_QUERY` con `JOIN` y funciones `row_to_x(row)` por índice de columna; `params![]`; transacciones explícitas (`conn.transaction()`) en operaciones compuestas.
- **Enums de dominio** con `as_str`/`parse` e `impl FromSql/ToSql` (`SaleStatus`, `SessionStatus`, `UserRole`, `AdjustmentType`, `SaleInputMode`, `CustomerMovementType`).
- **Actualización parcial**: `Option<T>` = "no cambiar"; un `UPDATE` por campo presente; luego relectura.
- **Migraciones**: `const MIGRATIONS: &[Migration]` con `include_str!`, checksum FNV-1a 64, transacción por migración, registro en `schema_migrations`, detección de bases heredadas (`detect_legacy_version`), semillas de usuario y settings con `INSERT OR IGNORE`.

### Frontend
- **Alias de importación** `@core/*` y `@modules/*` (Vite + tsconfig).
- **Servicios estáticos** por dominio: `static async metodo(): Promise<T> { return invoke<T>('comando', { request: dto }) }`; los parámetros se envían en camelCase (`srcPath`, `sessionId`) y Tauri los mapea a snake_case en Rust.
- **Páginas con estado local**: `useState` por formulario (valores como `string`), `loadData()` en `useEffect`, errores en `Alert` con autolimpieza (`cleanError`, 5 s).
- **Contextos**: `AuthContext` (usuario, rol, sesión de caja, revalidación al enfocar ventana) y `PosProvider` (carrito con `useReducer`, `posReducer` exportado para pruebas).
- **Precisión**: helpers de `shared/utils/money.ts` y `unitConversion.ts` sobre `decimal.js`.
- **Estilo**: MUI `sx` en línea, tema propio ("La Caja": verde `#0d6b5f`, ámbar `#c17d11`, fondo `#f0ede8`), tipografía tabular para cifras; textos de UI en español.
- **Convenciones declaradas** (`AGENTS.md`): camelCase/PascalCase, 2 espacios, punto y coma, comillas simples, sin `any`, `interface` para props. En la práctica conviven comillas dobles y simples (no hay Prettier configurado).

## Archivos relevantes para el intent activo

| Archivo | Rol actual | Por qué importa |
|---|---|---|
| `src/modules/pos/pages/POSPage.tsx` | Layout del POS (panel izquierdo búsqueda + carrito, panel derecho resumen) y diálogo de cobro | Punto de inserción del conmutador lista/cuadrícula |
| `src/modules/pos/components/PosSearchBar.tsx` | Input de escaneo, búsqueda por Enter, modal de coincidencias, diálogo a granel | Sugerencias en vivo y filtro compartido con la cuadrícula |
| `src/modules/pos/context/PosProvider.tsx` | Carrito (`posReducer`), `getRequestedProductQuantityAfterAdd` | Agregar desde la cuadrícula reutiliza `ADD_ITEM` |
| `src/modules/catalog/products/pages/ProductsPage.tsx` | CRUD de productos en tabla + diálogo | Campo de imagen (elegir/quitar/vista previa) |
| `src/modules/catalog/products/{types.ts,services/ProductService.ts}` | Contrato TS de producto | Nuevo campo de imagen y operaciones |
| `src/modules/settings/components/ImageField.tsx`, `pages/SettingsPage.tsx` | Patrón de selección y vista previa de imagen | Reutilizable/adaptable |
| `src-tauri/src/models/product.rs` | `Product`, `CreateProductRequest`, `UpdateProductRequest` | Nuevo campo y semántica de borrado |
| `src-tauri/src/modules/catalog/products/**` | Casos de uso, comandos y SQL de productos | Columna nueva, búsqueda, almacenamiento de imagen |
| `src-tauri/src/modules/sales/adapters/outbound/sqlite.rs` | `find_product` con SQL propio | Debe seguir compilando con el nuevo campo |
| `src-tauri/src/modules/settings/{application.rs,adapters/outbound/filesystem.rs}` | Puerto y adaptador de almacenamiento de imágenes | Patrón base para imágenes de producto |
| `src-tauri/src/infrastructure/sqlite/{migrations.rs,migrations/}` | Esquema versionado | Migración `0007` para la columna de imagen |
| `src-tauri/tauri.conf.json`, `capabilities/default.json` | Seguridad y permisos | Protocolo de assets / permisos si se sirven archivos locales |
