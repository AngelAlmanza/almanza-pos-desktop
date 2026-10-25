# Arquitectura — Almanza POS Desktop

## Architecture Analysis

### System Overview

Aplicación de escritorio monolítica construida con **Tauri 2**: un único proceso nativo en Rust aloja una WebView que ejecuta una SPA de **React 19 + MUI 7**. La SPA no habla con ninguna red: toda operación de negocio cruza el puente IPC de Tauri (`invoke()`) hacia comandos Rust que aplican reglas de negocio y persisten en un archivo **SQLite** (`pos.db`) dentro del directorio de datos de la aplicación. Las impresoras térmicas se controlan desde Rust (puerto serie USB o spooler de Windows). Los archivos de imagen (hoy solo el logotipo) se copian a `<app_data_dir>/resources/`.

### Architectural Style

**Monolito de escritorio en dos capas de proceso** (UI WebView + núcleo Rust) con:

- **Backend hexagonal por slices verticales** (`src-tauri/src/modules/<slice>/`): cada slice tiene `application.rs` (casos de uso como funciones libres + traits de puerto), `adapters/inbound/tauri.rs` (comandos IPC) y `adapters/outbound/{sqlite,filesystem,escpos}.rs` (implementaciones de puertos). Evidencia: `modules/catalog/products/application.rs` define `trait ProductRepository`; `adapters/outbound/sqlite.rs` lo implementa con `SqliteProductRepository<'db>`; el comando construye el adaptador por llamada (`SqliteProductRepository::new(&db)`).
- **Frontend modular por dominio** (`src/modules/<dominio>/{pages,components,services,types,context,utils}`), con servicios estáticos que envuelven `invoke()` y estado local por página (`useState`), más dos contextos: `AuthContext` (global) y `PosProvider` (solo ruta `/pos`, `useReducer`).
- **Persistencia embebida**: un `Database { conn: Mutex<Connection> }` gestionado como estado de Tauri; WAL y `foreign_keys=ON`; migraciones versionadas con checksum.

### Component Relationships

```mermaid
flowchart LR
  subgraph WebView["WebView - React SPA"]
    App["core/App.tsx rutas y guards"]
    Layout["core/layout/Layout.tsx"]
    Auth["modules/auth AuthContext"]
    POS["modules/pos POSPage + PosProvider"]
    Catalog["modules/catalog products, categories, inventory"]
    Others["sales, cash-register, customers, users, reports, settings"]
    Services["services/*.ts invoke wrappers"]
  end
  subgraph Core["Proceso Rust - Tauri 2"]
    Boot["bootstrap.rs plugins + generate_handler"]
    Inbound["adapters/inbound/tauri.rs comandos"]
    AppLayer["application.rs casos de uso + puertos"]
    Outbound["adapters/outbound sqlite, filesystem, escpos"]
    Printer["printer/ hardware ESC/POS"]
    DB[("SQLite pos.db WAL")]
    FS[("app_data_dir/resources")]
  end
  App --> Layout --> POS
  Layout --> Catalog
  Layout --> Others
  POS --> Auth
  POS --> Services
  Catalog --> Services
  Others --> Services
  Services -- "invoke IPC" --> Inbound
  Boot --> Inbound
  Inbound --> AppLayer --> Outbound
  Outbound --> DB
  Outbound --> FS
  Outbound --> Printer
```

Texto alternativo: la SPA (App → Layout → páginas de dominio) llama a servicios TypeScript; estos invocan comandos IPC registrados en `bootstrap.rs`; cada comando delega en la capa `application` del slice, que usa adaptadores salientes hacia SQLite, el sistema de archivos (imágenes) o el subsistema de impresora.

Dependencias entre slices del backend (solo por puertos o adaptadores, sin ciclos):

```mermaid
flowchart TD
  Sales["sales"] --> CatalogProducts["catalog/products modelo Product"]
  Sales --> CashRegister["cash_register modelo sesión"]
  Sales --> Customers["accounts_receivable modelo Customer"]
  AR["accounts_receivable"] --> CashRegisterLookup["cash_register CashRegisterSessionLookup"]
  Printing["printing"] --> SalesQuery["sales SalesQueryPort"]
  Printing --> PrinterSub["printer subsistema"]
  All["todos los slices"] --> Shared["shared error, money, pagination"]
  All --> Models["models structs serde"]
  All --> Infra["infrastructure/sqlite Database"]
```

Texto alternativo: `sales` lee productos, sesiones y clientes con su propio SQL; `accounts_receivable` consulta sesiones mediante el trait `CashRegisterSessionLookup`; `printing` lee ventas mediante `SalesQueryPort` y usa `printer/`; todos dependen de `shared`, `models` e `infrastructure/sqlite`.

### Data Flow

1. La UI mantiene el estado en memoria (React); los montos se calculan con `decimal.js` para retroalimentación inmediata.
2. Al confirmar, el servicio envía un DTO `snake_case` vía `invoke('<comando>', { request })`.
3. El comando Rust deserializa el request (`serde`), toma el `State<Database>`, construye el adaptador y llama al caso de uso.
4. El caso de uso valida (errores `AppError::{Validation, NotFound, Conflict, Database, Auth}` serializados como cadena en español) y delega en el adaptador, que bloquea el `Mutex<Connection>`, ejecuta SQL (con transacción en ventas, cancelaciones, abonos, ajustes y migraciones) y vuelve a leer la entidad.
5. La respuesta se serializa a JSON y regresa a la UI; los errores llegan como `string` y se muestran en `Alert`.
6. Estado persistente fuera de SQLite: sesión de login en `localStorage` (`pos_session`); logotipo en `<app_data_dir>/resources/<key>.<ext>`.

### Key Design Decisions

| Decisión | Evidencia | Implicación |
|---|---|---|
| Backend hexagonal por slices | `modules/*/application.rs` con traits | Los casos de uso son testeables con dobles; agregar una capacidad = nuevo puerto + adaptador |
| Una conexión SQLite con `Mutex` | `infrastructure/sqlite/database.rs` | Simplicidad y atomicidad; todo acceso a BD está serializado |
| Migraciones versionadas con checksum FNV-1a y detección de esquema heredado | `migrations.rs` | Cambios de esquema = nuevo `000N_*.sql` + entrada en `MIGRATIONS`; nunca editar una migración aplicada |
| Errores como cadenas en español | `shared/error.rs` (`Serialize` → string) | La UI muestra `String(err)` directamente; no hay códigos de error estructurados |
| Aritmética monetaria explícita | `shared/money.rs`, `modules/shared/utils/money.ts` | Toda nueva lógica de precio/cantidad debe usar estos helpers |
| Autorización solo en la UI | `core/guards/AuthGuard.tsx`; comandos sin chequeo de rol | Cualquier invocación IPC puede ejecutar comandos admin; riesgo aceptado en PoC |
| Imágenes como data URL base64 | `settings/adapters/outbound/filesystem.rs` | Sin configurar el protocolo de assets; costoso para muchas imágenes |
| `PosProvider` acotado a `/pos` | `core/App.tsx:40-42` | El carrito y cualquier estado del POS se pierden al navegar a otra ruta |

### Improvement Opportunities

- Validar rol/usuario en backend en lugar de confiar en `user_id` del cliente; habilitar una CSP.
- Sustituir `.ok()` por `.optional()?` en búsquedas para no ocultar errores de base de datos.
- Hacer transaccionales las actualizaciones parciales y permitir limpiar campos anulables (necesario para "quitar imagen").
- Centralizar el mapeo de `Product` (hoy duplicado en `sales`).
- Habilitar el protocolo de assets con alcance acotado (o un comando de miniaturas) para servir imágenes de producto sin base64 masivo.
- Agregar índice o columna normalizada para búsqueda por nombre (prefijo, sin acentos) si el catálogo crece.
- Actualizar la sección Architecture de `AGENTS.md`, que describe la estructura previa a la migración hexagonal.

## Interaction Diagrams

### Agregar producto al carrito por búsqueda / escaneo (flujo actual)

```mermaid
sequenceDiagram
  actor Cajero
  participant Bar as PosSearchBar
  participant PS as ProductService
  participant Cmd as comandos catalog/products
  participant Repo as SqliteProductRepository
  participant DB as SQLite
  participant Prov as PosProvider posReducer
  Cajero->>Bar: escribe o escanea y presiona Enter
  Bar->>PS: findByBarcode(term)
  PS->>Cmd: invoke find_product_by_barcode
  Cmd->>Repo: find_by_barcode
  Repo->>DB: SELECT ... WHERE barcode = ? AND active = 1
  alt código exacto encontrado
    DB-->>Bar: Product
  else no encontrado
    Bar->>PS: search(term)
    PS->>Cmd: invoke search_products
    Cmd->>Repo: search
    Repo->>DB: SELECT activos donde name o barcode contienen term, LIMIT 20
    DB-->>Bar: lista de Product
    alt 1 resultado
      Bar->>Bar: usar ese producto
    else varios resultados
      Bar->>Cajero: abre modal Buscar Producto
      Cajero->>Bar: elige un producto
    else ninguno
      Bar->>Cajero: error Producto no encontrado
    end
  end
  alt producto a granel
    Bar->>Cajero: BulkQuantityDialog base, subunidad o monto
    Cajero->>Bar: confirma selección
  end
  Bar->>Prov: dispatch ADD_ITEM con validación de stock
  Prov-->>Bar: carrito actualizado y foco de vuelta al input
```

Texto alternativo: Enter dispara primero una búsqueda exacta por código; si falla, una búsqueda `LIKE` por contenido (máx. 20, solo activos). Un resultado se agrega directo, varios abren el modal de selección, ninguno muestra error. Los productos a granel pasan por `BulkQuantityDialog`. El reductor valida stock y fusiona líneas iguales.

### Cobro de una venta

```mermaid
sequenceDiagram
  actor Cajero
  participant Page as POSPage
  participant SS as SaleService
  participant Cmd as create_sale
  participant App as sales application
  participant Repo as SqliteSalesRepository
  participant DB as SQLite
  participant Pr as PrinterService print_sale_ticket
  Cajero->>Page: Cobrar y captura MXN, USD, transferencia o fiado
  Page->>SS: create(dto con items e input metadata)
  SS->>Cmd: invoke create_sale
  Cmd->>App: create_sale(request)
  App->>Repo: find_session y find_product por item
  App->>App: valida caja abierta, stock, enteros, conversión, pagos y crédito
  App->>Repo: create_sale_atomically(draft)
  Repo->>DB: BEGIN, valida límite de crédito, INSERT sales, movimiento de cliente, sale_items, UPDATE stock, COMMIT
  DB-->>Page: Sale
  Page->>Page: CLEAR_CART y mensaje de cambio o adeudo
  Page->>Pr: si auto_print_sale, imprimir ticket
```

Texto alternativo: la UI envía la venta; el caso de uso recalcula precios y totales desde la BD, valida reglas y delega la escritura atómica (venta, partidas, descuento de stock y cargo a cliente) en una sola transacción; después la UI limpia el carrito e imprime si está configurado.

### Alta / edición de producto (flujo actual, sin imagen)

```mermaid
sequenceDiagram
  actor Admin
  participant Page as ProductsPage
  participant PS as ProductService
  participant Cmd as create_product o update_product
  participant App as catalog products application
  participant Repo as SqliteProductRepository
  participant DB as SQLite
  Admin->>Page: abre diálogo Nuevo o Editar
  Page->>Page: llena form con strings
  Admin->>Page: Crear o Guardar
  Page->>PS: create(dto) o update(dto parcial)
  PS->>Cmd: invoke con request
  Cmd->>App: valida nombre, precio, stock, granel y código único
  App->>Repo: create o update por campo
  Repo->>DB: INSERT o varios UPDATE
  DB-->>Page: Product
  Page->>Page: cierra diálogo y recarga lista
```

Texto alternativo: el formulario construye un DTO; el caso de uso valida y verifica unicidad del código de barras; el adaptador inserta o actualiza campo por campo (cada `Some` genera un `UPDATE`); la página recarga la lista completa.

### Guardado de imagen (patrón existente del logotipo, base para imágenes de producto)

```mermaid
sequenceDiagram
  actor Admin
  participant Page as SettingsPage
  participant Dlg as plugin-dialog open
  participant SetS as SettingService
  participant Cmd as save_setting_image
  participant App as settings application
  participant Store as LocalSettingsImageStorage
  participant FS as app_data_dir resources
  participant DB as SQLite settings
  Admin->>Page: Subir logo
  Page->>Dlg: open con filtros png jpg jpeg webp gif svg
  Dlg-->>Page: ruta absoluta del archivo
  Page->>SetS: saveImage(key, srcPath)
  SetS->>Cmd: invoke save_setting_image
  Cmd->>App: save_setting_image
  App->>Store: store(key, source_path)
  Store->>FS: create_dir_all y fs copy a key.ext
  Store-->>App: ruta destino y data URL base64
  App->>DB: UPDATE settings SET value = ruta
  App-->>Page: data URL para vista previa
```

Texto alternativo: el selector nativo devuelve una ruta; Rust copia el archivo a `resources/<key>.<ext>`, guarda la ruta absoluta en el setting y devuelve un data URL base64 que la UI usa como `src`. Para leerlo después, `get_setting_image` relee el archivo y lo codifica de nuevo.
