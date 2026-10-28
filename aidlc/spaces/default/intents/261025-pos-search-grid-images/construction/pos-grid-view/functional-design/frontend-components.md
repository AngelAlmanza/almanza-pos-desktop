# Componentes de frontend — U3 pos-grid-view

Define la jerarquía, las propiedades, el estado y la integración de los componentes de la vista de cuadrícula. El comportamiento y los flujos están en `functional-spec.md`; los estilos siguen `refined-mockups/mockups.md` y el sistema de diseño del proyecto.

## Jerarquía

```text
POSPage
├── (columna izquierda)
│   ├── Alert de error / éxito / aviso (existentes)
│   ├── PosSearchBar            ← modificado: ViewModeToggle, onTermChange, manejador addProduct
│   │   └── ViewModeToggle      ← nuevo
│   ├── [viewMode = list] SaleSummaryTable          (sin cambios)
│   └── [viewMode = grid] ProductGrid               ← nuevo
│       ├── GridSortControl     ← nuevo (criterio y dirección)
│       ├── GridStatus          ← nuevo (carga, error, vacíos, aviso de stock atrasado)
│       └── ProductGroup × N
│           └── ProductCard × N ← nuevo
└── (columna derecha)
    ├── [viewMode = list] Resumen de Venta (300 px, sin cambios)
    └── [viewMode = grid] CompactCart (360 px) + Resumen de Venta y Cobrar
```

La barra de búsqueda y el resumen de venta con "Cobrar" están en ambas vistas (FR2.2). Solo cambian la zona de partidas y su tabla.

## Estado y lógica

| Elemento | Dónde vive | Notas |
|---|---|---|
| `viewMode` (`'list'` o `'grid'`) | `POSPage`, inicializado con `readViewMode(user.id)` | Se escribe con `saveViewMode`; el borrado lo hace `AuthContext.logout` |
| `term` (texto de la barra) | `PosSearchBar` lo publica con `onTermChange`; `POSPage` lo pasa a `ProductGrid` | Se conserva al cambiar de vista |
| Productos, estado y secuencia | `useProductGrid(term)` (hook nuevo) | Retardo de 100 ms, secuencia, `reload()` y estados `loading`, `error`, `populated`, `refreshing`, `stale` |
| Orden (criterio y dirección) | `ProductGrid`, estado local | Por defecto nombre ascendente; no se recuerda |
| Agrupado y orden | `modules/pos/utils/productGrid.ts` (funciones puras) | `groupProducts`, `sortProducts`, `compareNames` |
| Preferencia de vista | `modules/pos/utils/viewMode.ts` (funciones puras) | `readViewMode`, `saveViewMode`, `clearViewMode`; sin errores hacia la pantalla |
| Recarga tras venta | `POSPage` incrementa un contador `salesVersion` después de cobrar y se lo pasa a `ProductGrid` | La cuadrícula llama a `reload()` al cambiar |

## ViewModeToggle (nuevo)

| Propiedad | Tipo | Notas |
|---|---|---|
| `value` | `'list' \| 'grid'` | Vista activa |
| `onChange` | `(mode) => void` | Ignora `null`; el foco vuelve a la barra después de cambiar |

`ToggleButtonGroup` exclusivo con `aria-label="Vista de productos"`; botones "Vista de lista" y "Vista de cuadrícula" con tooltip, `aria-label` y `aria-pressed`. `data-testid="view-mode-toggle"`.

## PosSearchBar (modificado)

Nuevas propiedades sobre las de U2 (`suggestionsEnabled`):

| Propiedad | Tipo | Notas |
|---|---|---|
| `viewMode` | `'list' \| 'grid'` | Con `grid`, las sugerencias se desactivan |
| `onViewModeChange` | `(mode) => void` | Lo recibe `ViewModeToggle` |
| `onTermChange` | `(term: string) => void` | Se llama en cada cambio de texto, también al borrarlo |
| `ref` | `PosSearchBarHandle` | `addProduct(product)`, `focus()` y `clear()` |

`addProduct(product)` ejecuta el flujo de `handleSuggestionSelected` (relectura por id, guarda de selección en curso, "Producto no encontrado", "Stock insuficiente. Disponible: 0", diálogo a granel, cantidad 1) con dos diferencias para el origen "tarjeta": no borra el texto de la barra al terminar y devuelve el foco a la barra. El diálogo a granel sigue montado en `PosSearchBar`.

## ProductGrid (nuevo)

| Propiedad | Tipo | Notas |
|---|---|---|
| `term` | `string` | Texto de la barra; filtra desde el primer carácter |
| `salesVersion` | `number` | Cambia tras cada venta cobrada y dispara `reload()` |
| `onProductSelect` | `(product: Product) => void` | Llama a `addProduct` de la barra |
| `onClearSearch` | `() => void` | Limpia la barra y devuelve el foco a ella |

- Contenedor con scroll propio, `aria-label="Productos"` y un `aria-live="polite"` que anuncia "N productos".
- Cada grupo es una `section` con `aria-labelledby` hacia su encabezado (sticky) que muestra el nombre y el número de productos visibles; las tarjetas van en `ul` / `li`.
- Distribución `auto-fill, minmax(176px, 1fr)`. A 1366 px caben 3 por fila; a 1024 px con el menú contraído, 3; a 1920 px, 7.
- `GridSortControl`: `Select` de criterio (nombre, precio, stock) y botón de dirección con `aria-label`.
- `data-testid`: `product-grid`, `product-group-<id>`, `grid-sort`, `grid-retry`, `grid-clear-search`.

## ProductCard (nuevo)

| Propiedad | Tipo | Notas |
|---|---|---|
| `product` | `Product` | Incluye `image_file` y `category_id` |
| `onSelect` | `(product: Product) => void` | Se llama también con la tarjeta agotada, para mostrar el aviso (P3) |

- `ButtonBase` nativo que envuelve el contenido; Enter y Espacio activan.
- Área de imagen de 120 px reservada. `img` con `loading="lazy"`, `alt=""` y `onError` que cambia al placeholder `Inventory2`; mientras carga, placeholder o esqueleto.
- Contenido: nombre (hasta 2 líneas), código, stock con unidad, precio con `formatCurrency` y chip "A granel" cuando aplica.
- Agotado (`isOutOfStock`): opacidad 0.55 que conserva un contraste mínimo de 3:1 en el texto, chip de texto "Agotado" y `aria-disabled="true"`. La etiqueta de accesibilidad incluye "agotado". Tocarla llama a `onSelect` y la barra muestra el aviso.
- Etiqueta: "Jamón de pavo FUD 250 g, $54.00, stock 12 pza" o "…, agotado".
- `data-testid="product-card-<id>"`.

## CompactCart (nuevo)

| Propiedad | Tipo | Notas |
|---|---|---|
| `onEmptyFocus` | `() => void` | Devuelve el foco a la barra cuando se elimina la última partida |

- Lee el carrito de `usePos()` y despacha las mismas acciones que `SaleSummaryTable`: `INCREMENT`, `SET_INPUT`/`SET_QUANTITY` por el diálogo existente y `REMOVE_ITEM`.
- Cada partida: primera línea con el nombre y el total; segunda línea con "cantidad × precio base" (P2) y los controles −/+, "Editar" (granel) y eliminar.
- Vacío: "Toca un producto para agregarlo". Una partida recién agregada se resalta con fondo teal al 8 % durante 600 ms.
- Lista `ul` con encabezado "Venta actual" y `aria-label` por botón ("Disminuir cantidad de …", "Aumentar …", "Eliminar …").
- `data-testid`: `compact-cart`, `compact-cart-item-<lineKey>`.

## POSPage (modificado)

- Calcula `viewMode`, lo pasa a la barra, a la zona de partidas y a la columna derecha.
- En `grid`, la columna derecha muestra `CompactCart` encima del panel de resumen y "Cobrar" (ambos sin cambios de lógica) y la zona izquierda muestra `ProductGrid`.
- Tras `SaleService.create` exitoso, incrementa `salesVersion`.
- Sin caja abierta conserva el estado actual "No hay una caja abierta".

## AuthContext (modificado)

`logout` borra `pos_view_mode` junto con la sesión, con `clearViewMode()` envuelto para que un fallo de almacenamiento no impida cerrar sesión.

## Validación y errores

- No hay formularios nuevos. La única validación de entrada es la preferencia guardada (W8) y el texto de la barra.
- Errores de carga: `Alert` con "Reintentar" (sin datos previos) o aviso discreto de stock atrasado (con datos previos). Los errores de agregado usan el `Alert` del POS, igual que la barra.

## Integración con el backend

| Uso | Comando | Notas |
|---|---|---|
| Carga sin texto | `get_active_products` | Servicio existente `ProductService.getActive()` |
| Filtro con texto | `suggest_products` sin límite | Servicio `ProductService.suggest(term)` de U2 |
| Relectura al agregar | `get_product` | `ProductService.getById(id)` |
| Categorías | las del propio producto (`category_name` si existe, o la lista de categorías ya disponible) | La fuente exacta del nombre de categoría se confirma en Code Generation leyendo el modelo `Product` |

## Pruebas

Ver "Pruebas previstas" en `functional-spec.md`: Vitest de las funciones puras (`productGrid.ts`, `viewMode.ts`, reductor de estados), con `data-testid` en los elementos interactivos para la verificación manual y futuras pruebas de componente.

## Sources

- `functional-spec.md` de esta unidad (W1–W10, G1–G9).
- `inception/refined-mockups/interaction-spec.md`: ViewModeToggle, ProductGrid, ProductCard y CompactCart.
- `construction/search-suggestions/functional-design/frontend-components.md`: `PosSearchBar` y `suggestionsEnabled`.
- `construction/product-image/functional-design/functional-spec.md`: contrato `productImageSource`.
- Código actual: `src/modules/pos/pages/POSPage.tsx`, `src/modules/pos/components/PosSearchBar.tsx`, `src/modules/pos/components/SaleSummaryTable.tsx` y `src/modules/pos/context/PosProvider.tsx`.

## Assumptions & Open Questions

- [assumption] Las cifras de columnas siguen la corrección de la revisión de mockups (3 a 1366 px y a 1024 px, 7 a 1920 px).
- [assumption] La opacidad de la tarjeta agotada se fija en Code Generation de modo que el texto conserve al menos 3:1 de contraste.
- [assumption] El nombre de la categoría de cada producto se resuelve con los datos que el modelo `Product` ya expone o con la lista de categorías existente; si no alcanza, se agrega al comando de productos activos y se anota en el resumen de código.
- Abierta: el mecanismo exacto con el que `POSPage` expone `ref` hacia `PosSearchBar` (propiedad `ref` de React 19) se confirma en Code Generation.
