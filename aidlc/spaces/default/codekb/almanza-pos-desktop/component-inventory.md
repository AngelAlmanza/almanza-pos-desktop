# Inventario de componentes — Almanza POS Desktop

Cada encabezado de nivel 3 es el identificador canónico del componente (lo usa el bloque Scope of Analysis de `reverse-engineering-timestamp.md`). Los comandos IPC de cada componente están detallados en `api-documentation.md`; las dependencias externas en `dependencies.md`.

## Backend (Rust, `src-tauri/src/`)

### rust-bootstrap
- **Ubicación**: `main.rs`, `lib.rs`, `bootstrap.rs`, `constants.rs`
- **Responsabilidad**: arranque de Tauri; registra plugins `fs`, `dialog`, `opener`; crea `Database` en `setup` y la gestiona como estado; registra los 58 comandos en `generate_handler!`; constantes de paginación (50/200) y `SEARCH_RESULT_LIMIT = 20`.
- **Depende de**: todos los adaptadores inbound, `rust-sqlite-infrastructure`.
- **Intent**: cualquier comando nuevo (p. ej. guardar/quitar imagen de producto, sugerencias) debe añadirse aquí.

### rust-sqlite-infrastructure
- **Ubicación**: `infrastructure/sqlite/{database.rs,migrations.rs,migrations/0001…0006_*.sql}`
- **Responsabilidad**: abrir `pos.db` en `app_data_dir` con WAL y claves foráneas; aplicar migraciones versionadas con checksum en transacción; registrar bases heredadas; sembrar usuario `root` y settings por defecto.
- **Depende de**: rusqlite, bcrypt, tauri (`AppHandle`).
- **Intent**: la columna de imagen requiere `0007_*.sql` y una entrada en `MIGRATIONS`; `detect_legacy_version` solo aplica cuando `schema_migrations` está vacío.

### rust-shared-kernel
- **Ubicación**: `shared/{error.rs,money.rs,pagination.rs}`
- **Responsabilidad**: `AppError`/`AppResult` serializables; redondeo monetario (`round2`, `mul_money`, `sum_money`, ...) y de stock (`round3`, `add_stock`, `sub_stock`); `PaginatedResult<T>`.
- **Depende de**: serde, rusqlite, bcrypt (conversiones de error).

### rust-models
- **Ubicación**: `models/{product,category,sale,cash_register,customer,inventory,setting,user}.rs`
- **Responsabilidad**: structs serde de filas y requests; enums de dominio con `FromSql/ToSql`.
- **Intent**: `Product`, `CreateProductRequest` y `UpdateProductRequest` no tienen campo de imagen.

### rust-identity
- **Ubicación**: `modules/identity/`
- **Responsabilidad**: login con bcrypt, CRUD de usuarios, bloqueo de borrado con historial.
- **Puertos**: `UserRepository` → `SqliteUserRepository`.

### rust-catalog-products
- **Ubicación**: `modules/catalog/products/`
- **Responsabilidad**: listar (todos/activos), obtener, buscar por código exacto, búsqueda por contenido (máx. 20), crear/actualizar con validaciones (nombre, precio, stock, granel, código único), borrar con protección de historial.
- **Puertos**: `ProductRepository` → `SqliteProductRepository` (`SELECT_QUERY` con `LEFT JOIN categories`, `row_to_product` por índices).
- **Pruebas**: 3 de validación de granel; 1 de crear/actualizar `is_bulk` con BD en memoria (esquema propio en la prueba).
- **Intent**: componente central para imagen (columna, contrato, almacenamiento) y para sugerencias de búsqueda.

### rust-catalog-categories
- **Ubicación**: `modules/catalog/categories/`
- **Responsabilidad**: CRUD de categorías con nombre único.
- **Puertos**: `CategoryRepository` → `SqliteCategoryRepository`.
- **Intent**: fuente de los grupos de la cuadrícula (además de `category_name` ya incluido en `Product`).

### rust-inventory
- **Ubicación**: `modules/inventory/`
- **Responsabilidad**: ajustes de stock transaccionales con bitácora; consultas paginadas.
- **Puertos**: `InventoryRepository` → `SqliteInventoryRepository`; `StockMutationPort` sin implementar.

### rust-sales
- **Ubicación**: `modules/sales/`
- **Responsabilidad**: preparar el borrador de venta (validaciones de caja, stock, enteros, conversión de captura, pagos, crédito) y persistirlo atómicamente; cancelar con devolución de stock; consultas, reporte y top de productos.
- **Puertos**: `SaleDraftDependencies`, `SalesUnitOfWork`, `SalesQueryPort` → `SqliteSalesRepository` (811 líneas, incluye su propio `find_product`).
- **Pruebas**: 2 en adaptador (stock a granel y venta fiada), 2 de validación de captura.
- **Intent**: al agregar un campo a `Product`, su `find_product` y las fixtures de prueba deben actualizarse.

### rust-cash-register
- **Ubicación**: `modules/cash_register/`
- **Responsabilidad**: abrir (una a la vez), cerrar con arqueo y resumen esperado/real incluyendo abonos; consultas paginadas.
- **Puertos**: `CashRegisterRepository`, `CashRegisterSessionLookup` → `SqliteCashRegisterRepository`.

### rust-accounts-receivable
- **Ubicación**: `modules/accounts_receivable/`
- **Responsabilidad**: clientes con límite de crédito, saldo calculado, movimientos y abonos transaccionales.
- **Puertos**: `CustomerRepository` → `SqliteCustomerRepository`; usa `CashRegisterSessionLookup`.

### rust-settings
- **Ubicación**: `modules/settings/`
- **Responsabilidad**: leer/actualizar settings; crear/borrar solo en debug; **guardar y leer imágenes** (logotipo).
- **Puertos**: `SettingsRepository` → `SqliteSettingsRepository`; `SettingsImageStorage` → `LocalSettingsImageStorage` (copia a `<app_data_dir>/resources/<key>.<ext>`, data URL base64 con codificador propio, MIME por extensión).
- **Intent**: patrón de referencia para el almacenamiento de imágenes de producto.

### rust-printing
- **Ubicación**: `modules/printing/`
- **Responsabilidad**: configuración de impresora desde settings, detección, prueba e impresión del ticket de venta.
- **Puertos**: `PrintingSettingsRepository`, `SaleReader`, `PrinterPort` → `SqlitePrintingSettingsRepository`, `SqliteSalesRepository`, `EscposPrinterPort`.

### rust-printer-subsystem
- **Ubicación**: `printer/{config,hardware,manager,models,ticket_builder,utils}.rs`, `printer/adapters/{mod,escpos}.rs`
- **Responsabilidad**: mapear settings a `PrinterConfig`; construir `TicketData` desde una venta; generar comandos ESC/POS en texto ASCII seguro (`deunicode`); enviar por puerto serie USB (`serialport`, 9600 baudios) o spooler RAW de Windows (`windows` crate); detección con PowerShell `Get-Printer`.
- **Pruebas**: 6 de ESC/POS, 5 de configuración, 2 de ticket.

## Frontend (TypeScript/React, `src/`)

### fe-core-shell
- **Ubicación**: `main.tsx`, `core/App.tsx`, `core/theme.ts`, `core/layout/Layout.tsx`, `core/guards/AuthGuard.tsx`
- **Responsabilidad**: proveedores (fechas con Moment, tema MUI, `AuthProvider`), rutas con guards (`/pos` envuelto por `PosProvider`; productos, categorías, inventario, usuarios, reportes y configuración solo admin); barra lateral oscura y AppBar; carga de la caja abierta del usuario al iniciar.
- **Depende de**: fe-auth, todas las páginas.

### fe-auth
- **Ubicación**: `modules/auth/{context/AuthContext.tsx,services/AuthService.ts,pages/LoginPage.tsx,types.ts}`
- **Responsabilidad**: login, sesión en `localStorage` (`pos_session`), revalidación del usuario al iniciar y al enfocar la ventana, `cashRegisterSession` global.
- **Intent**: si la preferencia de vista debe vivir "por sesión", hoy no hay almacén de preferencias; `AuthContext` y `sessionStorage` son candidatos.

### fe-pos
- **Ubicación**: `modules/pos/{pages/POSPage.tsx,components/PosSearchBar.tsx,components/SaleSummaryTable.tsx,components/BulkQuantityDialog.tsx,context/PosProvider.tsx,utils/saleItemPresentation.ts,types.ts}`
- **Responsabilidad**: punto de venta. `POSPage` arma el layout (búsqueda + carrito a la izquierda, resumen de venta 300 px a la derecha) y el diálogo de cobro (MXN/USD/transferencia, fiado con cliente, cambio, impresión automática). `PosSearchBar` gestiona el input de escaneo (foco automático), la búsqueda por Enter, el modal "Buscar Producto" y el diálogo a granel. `SaleSummaryTable` edita cantidades. `PosProvider` mantiene el carrito con `posReducer` (`ADD_ITEM`, `INCREMENT`, `SET_QUANTITY`, `SET_INPUT`, `REMOVE_ITEM`, `CLEAR_CART`) y validación de stock por producto.
- **Depende de**: fe-auth, fe-catalog-products (tipos y `ProductService`), fe-customers, fe-sales, fe-settings (`PrinterService`), fe-shared.
- **Intent**: componente principal de las sugerencias en vivo y de la vista de cuadrícula (conmutador, agrupación por categoría, orden y filtro).

### fe-catalog-products
- **Ubicación**: `modules/catalog/products/{pages/ProductsPage.tsx,services/ProductService.ts,types.ts,constants/Units.ts}`
- **Responsabilidad**: tabla de productos con estado activo, alta/edición en diálogo (nombre, descripción, código, precio, unidad, granel, categoría, stock inicial/mínimo), alta rápida de categoría, borrado con confirmación.
- **Intent**: campo de imagen opcional con vista previa, cambio y eliminación; tipos `Product`/`CreateProductDTO`/`UpdateProductDTO`.

### fe-catalog-categories
- **Ubicación**: `modules/catalog/categories/`
- **Responsabilidad**: CRUD de categorías.

### fe-catalog-inventory
- **Ubicación**: `modules/catalog/inventory/`
- **Responsabilidad**: ajustes de inventario y bitácora paginada por fechas.

### fe-sales
- **Ubicación**: `modules/sales/`
- **Responsabilidad**: historial de ventas (admin por rango de fechas; cajero por su caja), detalle de partidas, cancelación y reimpresión.

### fe-cash-register
- **Ubicación**: `modules/cash-register/`
- **Responsabilidad**: abrir/cerrar caja, resúmenes de corte, historial paginado, impresión del corte vía ventana HTML (`TicketPrinter`).

### fe-customers
- **Ubicación**: `modules/customers/`
- **Responsabilidad**: clientes, detalle de cuenta, movimientos y registro de abonos.

### fe-users
- **Ubicación**: `modules/users/`
- **Responsabilidad**: CRUD de usuarios y activación.

### fe-reports
- **Ubicación**: `modules/reports/`
- **Responsabilidad**: métricas por rango, top de productos, exportación PDF (jsPDF + autotable) y Excel (exceljs) con diálogo de guardado y `writeFile`.

### fe-settings
- **Ubicación**: `modules/settings/{pages/SettingsPage.tsx,components/{SettingRow,ImageField,PrinterSettingsCard}.tsx,services/{SettingService,PrinterService}.ts,constants,types.ts}`
- **Responsabilidad**: edición de settings por grupo, carga de logotipo con `open()` del plugin de diálogo, configuración y prueba de impresora.
- **Intent**: `ImageField` y `handleImageUpload` son el patrón de UI de referencia para la imagen de producto (no tiene acción de quitar).

### fe-shared
- **Ubicación**: `modules/shared/{components/ConfirmModal.tsx,constants,types,utils}`
- **Responsabilidad**: tipos base (`ProductUnit`, `SaleInputMode`, ...), aritmética `decimal.js` (`money.ts`), conversión de unidades (`unitConversion.ts`), formato de moneda, etiquetas de pago, limpieza de errores, ticket de corte HTML.

### fe-unit-tests
- **Ubicación**: `src/__tests__/modules/**`
- **Responsabilidad**: 7 archivos Vitest (entorno `node`) sobre reductor del POS, presentación de partidas, helpers de reportes, cálculos decimales, formato de moneda, etiquetas de pago y conversión de unidades.
- **Huecos**: sin pruebas de componentes ni de servicios.
