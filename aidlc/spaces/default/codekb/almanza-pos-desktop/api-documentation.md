# Documentación de API — Almanza POS Desktop

La aplicación no expone HTTP. Su superficie de API es el **puente IPC de Tauri**: 58 comandos `#[tauri::command]` registrados en `src-tauri/src/bootstrap.rs` y consumidos desde servicios TypeScript que envuelven `invoke()`. Además hay **puertos internos** (traits Rust) entre casos de uso y adaptadores.

## Convenciones del contrato IPC

- **Invocación**: `invoke<T>('nombre_comando', { args })`. Los nombres de argumento del frontend van en camelCase (`srcPath`, `sessionId`, `userId`, `pageSize`) y Tauri los mapea a los parámetros snake_case de Rust (`src_path`, `session_id`, ...). Los objetos `request`/`config` conservan campos snake_case (serde por defecto).
- **Éxito**: el valor serializado con serde (JSON). `()` llega como `null`; `Option<T>` como `T | null`.
- **Error**: `AppError` se serializa como **cadena** con el mensaje en español (p. ej. `"Producto no encontrado"`, `"El producto con código de barras X ya existe"`). Variantes: `Validation`, `NotFound`, `Conflict`, `Database`, `Auth`; la UI solo recibe el texto.
- **Autenticación/autorización**: ningún comando valida token ni rol; el control de acceso está en los guards de React. Los comandos que registran actor reciben `user_id` del cliente.
- **Paginación**: `page` (≥1, por defecto 1) y `page_size` (por defecto 50, máx. 200) → `PaginatedResult<T> { data, total, page, page_size }`.
- **Fechas**: cadenas `YYYY-MM-DD HH:MM:SS` en hora local (`datetime('now','localtime')`).

## Comandos por slice

### identity (`modules/identity/adapters/inbound/{auth_tauri,users_tauri}.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `login` | `request: { username, password }` | `LoginResponse { user: User, token: string }` | bcrypt; error si usuario inactivo o contraseña incorrecta; token UUID v4 no persistido |
| `get_current_user` | `user_id: i64` | `User` | Revalidación de sesión al iniciar/enfocar |
| `get_users` | — | `User[]` | |
| `get_user` | `id` | `User` | |
| `create_user` | `request: { username, password, full_name, role: 'admin'\|'cashier' }` | `User` | Usuario único |
| `update_user` | `request: { id, username?, password?, full_name?, role?, active? }` | `User` | Parcial |
| `delete_user` | `id` | `null` | Bloqueado si tiene sesiones, ventas o ajustes |

`User = { id, username, full_name, role, active, created_at, updated_at }`.

### catalog/categories (`modules/catalog/categories/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_categories` | — | `Category[]` | `ORDER BY name` |
| `get_category` | `id` | `Category` | |
| `create_category` | `request: { name, description? }` | `Category` | Nombre único (Conflict) |
| `update_category` | `request: { id, name?, description? }` | `Category` | Parcial |
| `delete_category` | `id` | `null` | Los productos quedan con `category_id = NULL` (FK `ON DELETE SET NULL`) |

`Category = { id, name, description: string|null, created_at }`.

### catalog/products (`modules/catalog/products/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_products` | — | `Product[]` | Todos (activos e inactivos), `ORDER BY p.name` |
| `get_active_products` | — | `Product[]` | Solo activos, `ORDER BY p.name`; **sin consumidor en la UI actual** (candidato para la vista de cuadrícula) |
| `get_product` | `id` | `Product` | |
| `find_product_by_barcode` | `barcode: string` | `Product` | Coincidencia exacta, solo activos; NotFound si no existe |
| `search_products` | `term: string` | `Product[]` | Solo activos; `name LIKE '%term%' OR barcode LIKE '%term%'`; `ORDER BY p.name LIMIT 20` (`constants::SEARCH_RESULT_LIMIT`) |
| `create_product` | `request: CreateProductRequest` | `Product` | Valida nombre no vacío, precio/stock/mínimo ≥ 0, granel solo kg/litro/metro, código de barras único |
| `update_product` | `request: UpdateProductRequest` | `Product` | Parcial; `None` = no cambiar (no permite poner `NULL`) |
| `delete_product` | `id` | `null` | Conflict si tiene `sale_items` o `inventory_adjustments` |

```text
Product = { id, name, description|null, barcode|null, price, unit, is_bulk, category_id|null,
            category_name|null, stock, min_stock, active, created_at, updated_at }
CreateProductRequest = { name, description?, barcode?, price, unit, is_bulk (default false),
                         category_id?, stock?, min_stock? }
UpdateProductRequest = { id, name?, description?, barcode?, price?, unit?, is_bulk?,
                         category_id?, min_stock?, active? }
```

No existe campo de imagen en ningún contrato de producto (ver "Brechas para el intent").

### inventory (`modules/inventory/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_inventory_adjustments` | — | `InventoryAdjustment[]` | |
| `get_inventory_adjustments_by_date_range` | `request: { start_date, end_date }, page?, page_size?` | `PaginatedResult<InventoryAdjustment>` | |
| `get_inventory_adjustments_by_product` | `product_id` | `InventoryAdjustment[]` | |
| `create_inventory_adjustment` | `request: { product_id, user_id, adjustment_type: 'add'\|'positive'\|'negative', quantity, reason? }` | `InventoryAdjustment` | Transaccional; cantidad > 0; no deja stock negativo |

### sales (`modules/sales/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `create_sale` | `request: CreateSaleRequest` | `Sale` | Recalcula precios desde BD; valida caja abierta, stock, enteros, metadatos de captura, pagos ≥ 0, USD con T/C, cliente para crédito y límite; transacción única |
| `get_sale` | `id` | `Sale` | Incluye `items` |
| `get_sales` | — | `Sale[]` | |
| `get_sales_by_session` | `session_id, page?, page_size?` | `PaginatedResult<Sale>` | |
| `get_sales_by_date_range` | `request: { start_date, end_date }, page?, page_size?` | `PaginatedResult<Sale>` | |
| `get_sales_report` | `request: { start_date, end_date }` | `SalesReport` | Totales, promedio, crédito vendido/cobrado, saldo pendiente, top 5 deudores, ventas |
| `get_top_products` | `start_date, end_date, limit? (10)` | `TopProduct[]` | Solo ventas completadas |
| `cancel_sale` | `sale_id` | `null` | Devuelve stock; prohibido si ya cancelada o fiada |

```text
CreateSaleRequest = { cash_register_session_id, user_id, payment_cash_mxn, payment_cash_usd,
                      payment_transfer, customer_id?, items: CreateSaleItemRequest[] }
CreateSaleItemRequest = { product_id, quantity, input_mode: 'base'|'sub'|'amount',
                          input_value, input_unit }
```

### cash_register (`modules/cash_register/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_cash_register_sessions` | — | `CashRegisterSession[]` | |
| `get_cash_register_sessions_by_date_range` | `request, page?, page_size?` | `PaginatedResult<CashRegisterSession>` | |
| `get_cash_register_session` | `id` | `CashRegisterSession` | |
| `get_open_cash_register` | — | `CashRegisterSession \| null` | Cualquier caja abierta |
| `get_open_cash_register_by_user` | `user_id` | `CashRegisterSession \| null` | |
| `open_cash_register` | `request: { user_id, opening_amount, exchange_rate? }` | `CashRegisterSession` | Solo una abierta |
| `close_cash_register` | `request: { session_id, closing_cash_mxn, closing_cash_usd }` | `CashRegisterSummary` | Esperado vs. real |
| `get_cash_register_summary` | `session_id` | `CashRegisterSummary` | |

### accounts_receivable (`modules/accounts_receivable/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_customers` | — | `Customer[]` | Con `balance` calculado |
| `get_active_customers` | — | `Customer[]` | Usado en el cobro fiado del POS |
| `get_customer` | `id` | `Customer` | |
| `create_customer` | `request: { name, phone?, notes?, credit_limit? }` | `Customer` | Límite por defecto desde setting `default_customer_credit_limit` |
| `update_customer` | `request: { id, name?, phone?, notes?, credit_limit?, active? }` | `Customer` | |
| `get_customer_movements` | `customer_id` | `CustomerAccountMovement[]` | |
| `register_customer_payment` | `request: { customer_id, cash_register_session_id, user_id, payment_cash_mxn, payment_cash_usd, payment_transfer, notes? }` | `CustomerAccountMovement` | Caja abierta; no excede adeudo; transaccional |

### settings (`modules/settings/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_settings` | — | `Setting[]` | Ordenado por grupo y `sort_order` |
| `update_setting` | `request: { key, value: string\|null }` | `Setting` | |
| `create_setting` | `request: { key, value?, value_type, label, description?, group_name, sort_order? }` | `Setting` | Solo en build debug |
| `delete_setting` | `key` | `null` | Solo en build debug |
| `save_setting_image` | `key, src_path` | `string` (data URL base64) | Copia el archivo a `<app_data_dir>/resources/<key>.<ext>` y guarda la ruta absoluta en `settings.value` |
| `get_setting_image` | `key` | `string \| null` | Relee el archivo y lo devuelve como data URL; `null` si no hay ruta o el archivo no existe |

`value_type ∈ { string, multiline, number, boolean, image_path }` (CHECK en BD).

### printing (`modules/printing/adapters/inbound/tauri.rs`)

| Comando | Parámetros | Retorno | Notas |
|---|---|---|---|
| `get_printer_config` | — | `PrinterSettings` | Desde settings `printer_*` |
| `save_printer_config` | `config: PrinterSettings` | `null` | Upsert de cada clave |
| `detect_usb_printers` | — | `PrinterInfo[]` | async; puertos serie USB + `Get-Printer` de Windows |
| `test_printer` | — | `null` | async; ticket de prueba |
| `print_sale_ticket` | `sale_id` | `null` | async; Conflict si la impresora está deshabilitada |

## Servicios frontend (envoltorios de IPC)

| Servicio | Archivo | Comandos |
|---|---|---|
| `AuthService` | `src/modules/auth/services/AuthService.ts` | `login`, `get_current_user` (+ sesión en `localStorage` clave `pos_session`) |
| `UserService` | `src/modules/users/services/UserService.ts` | `get_users`, `get_user`, `create_user`, `update_user`, `delete_user` |
| `CategoryService` | `src/modules/catalog/categories/services/CategoryService.ts` | `get_categories`, `get_category`, `create_category`, `update_category`, `delete_category` |
| `ProductService` | `src/modules/catalog/products/services/ProductService.ts` | `get_products`, `get_active_products`, `get_product`, `find_product_by_barcode`, `search_products`, `create_product`, `update_product`, `delete_product` |
| `InventoryService` | `src/modules/catalog/inventory/services/InventoryService.ts` | 4 comandos de inventario |
| `SaleService` | `src/modules/sales/services/SaleService.ts` | 8 comandos de ventas |
| `CashRegisterService` | `src/modules/cash-register/services/CashRegisterService.ts` | 8 comandos de caja |
| `CustomerService` | `src/modules/customers/services/CustomerService.ts` | 7 comandos de clientes |
| `SettingService` | `src/modules/settings/services/SettingService.ts` | 6 comandos de settings (`saveImage(key, srcPath)`, `getImage(key)`) |
| `PrinterService` | `src/modules/settings/services/PrinterService.ts` | 5 comandos de impresión |

APIs de plugins usadas directamente desde la UI: `@tauri-apps/plugin-dialog` (`open` en `SettingsPage`, `save` en `ReportGenerator`), `@tauri-apps/plugin-fs` (`writeFile` en `ReportGenerator`), `@tauri-apps/api/path` (`downloadDir`, `join`).

## Puertos internos (traits Rust)

| Trait | Definido en | Implementación | Consumidor |
|---|---|---|---|
| `UserRepository` | `identity/application.rs` | `SqliteUserRepository` | casos de uso identity |
| `CategoryRepository` | `catalog/categories/application.rs` | `SqliteCategoryRepository` | casos de uso categorías |
| `ProductRepository` (`find_all`, `find_active`, `find_by_id`, `find_by_barcode`, `search`, `create`, `update`, `delete`) | `catalog/products/application.rs` | `SqliteProductRepository` | casos de uso productos |
| `InventoryRepository` | `inventory/application.rs` | `SqliteInventoryRepository` | casos de uso inventario |
| `StockMutationPort` | `inventory/application.rs` | ninguna (`dead_code`) | — |
| `SaleDraftDependencies`, `SalesUnitOfWork`, `SalesQueryPort` | `sales/application.rs` | `SqliteSalesRepository` | ventas; `SalesQueryPort` también vía `SaleReader` en printing |
| `CashRegisterRepository`, `CashRegisterSessionLookup` | `cash_register/application.rs` | `SqliteCashRegisterRepository` | caja; lookup usado por accounts_receivable |
| `CustomerRepository` | `accounts_receivable/application.rs` | `SqliteCustomerRepository` | clientes |
| `SettingsRepository` | `settings/application.rs` | `SqliteSettingsRepository` | settings |
| `SettingsImageStorage` (`store(key, source_path) -> StoredSettingImage { path, data_url }`, `read_data_url(path)`) | `settings/application.rs` | `LocalSettingsImageStorage` (`filesystem.rs`) | `save_setting_image`, `get_setting_image` |
| `PrintingSettingsRepository`, `SaleReader`, `PrinterPort` (async) | `printing/application.rs` | `SqlitePrintingSettingsRepository`, `SqliteSalesRepository`, `EscposPrinterPort` | impresión |
| `PrinterAdapter` (async), `PrinterConnection` (async) | `printer/adapters/mod.rs`, `printer/hardware.rs` | `ESCPosAdapter`; `USBConnection`, `WindowsSpoolerConnection` | `PrinterManager` |

## Brechas para el intent activo

- No hay comando de **sugerencias** ni de búsqueda por prefijo; `search_products` busca por contenido con límite fijo de 20 y no recibe límite ni categoría.
- No hay campo ni comando para **imagen de producto**; tampoco forma de "quitar" un valor anulable mediante `update_product`.
- El patrón de imágenes devuelve **data URLs base64** por comando individual; no hay operación por lotes ni URLs de archivo (`convertFileSrc`) porque el protocolo de assets no está habilitado.
