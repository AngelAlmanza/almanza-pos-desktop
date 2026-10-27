# Componentes de frontend — U2 search-suggestions

Complementa a `functional-spec.md`, que es la fuente de verdad de los flujos (W1–W8), las reglas (L1–L7) y el contrato `suggest_products`. Aquí se define la jerarquía de componentes, sus propiedades y estado, la integración con el backend y las validaciones. Es diseño a nivel de interfaz: el código se escribe en Code Generation.

## Jerarquía

```text
POSPage
└── PosSearchBar            (modificado)
    ├── campo de escaneo y búsqueda (TextField existente, ahora combobox)
    ├── ProductSuggestionList   (nuevo, presentacional, en un Popper bajo el campo)
    ├── diálogo "Buscar Producto"   (existente, sin cambios)
    └── BulkQuantityDialog          (existente, sin cambios)

Lógica sin interfaz (nueva):
  useProductSuggestions        hook: retardo, secuencia, estado de la lista
  productSuggestions.ts        funciones puras: disparo, resaltado, decisión de Enter, reductor
  ProductService.suggest       llamada a suggest_products
```

Archivos previstos (rutas relativas a `src/modules/pos/`): `components/ProductSuggestionList.tsx`, `hooks/useProductSuggestions.ts`, `utils/productSuggestions.ts`; pruebas en `src/__tests__/modules/pos/utils/productSuggestions.test.ts`. `ProductService.suggest` va en `src/modules/catalog/products/services/ProductService.ts`.

## PosSearchBar (modificado)

### Propiedades

| Propiedad | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `suggestionsEnabled` | `boolean` | no | `true` | En `false` no se consulta ni se muestra la lista; U3 lo usa en vista de cuadrícula |

No se agregan otras propiedades en esta unidad. `viewMode`, `onViewModeChange` y `onTermChange` de la especificación de interacción son de U3.

### Estado propio

| Estado | Tipo | Uso |
|---|---|---|
| `barcodeInput` | `string` (existente) | texto del campo; alimenta las sugerencias |
| `highlightedIndex` | `number \| null` | fila resaltada; `null` = ninguna (L5) |
| `listOpen` | `boolean` | la lista de filas se muestra solo si el estado del hook es `ready` o `empty` y `listOpen` es verdadero; en `loading` solo se ve la barra de progreso |
| `searchResults`, `showSearch`, `searchTerm`, `pendingProduct` | existentes | diálogo "Buscar Producto" y diálogo a granel, sin cambios |

### Comportamiento

1. **Texto** (`onChange`): actualiza `barcodeInput`, quita el resaltado (L5), abre la lista y notifica al hook, que invalida las consultas en vuelo (L4).
2. **Teclas** (`onKeyDown` del campo): ↓, ↑, Esc y Tab según la tabla de teclado de `functional-spec.md`. Con Enter, si `decideEnter` devuelve `'select-highlighted'` (lista abierta en `ready` con fila resaltada), se llama a `preventDefault()` para que el formulario no se envíe y se agrega esa sugerencia; en cualquier otro caso, incluido `loading`, el evento sigue al `onSubmit` actual (W5).
   - **Cierre síncrono en Enter**: al empezar el `onSubmit` del flujo actual, antes de cualquier `await`, se llama a `closeAndInvalidate()`: pone `listOpen` en falso, quita el resaltado e invalida la secuencia del hook (L4). El vaciado de `barcodeInput` en el `finally` existente se conserva, pero no se depende de él. El flujo de búsqueda por código y por coincidencias no cambia.
3. **Selección** (clic o Enter sobre una fila), pasos de W3:
   - lee el producto con `ProductService.getById(id)`;
   - si falla o `active` es `false`: `setError('Producto no encontrado')` con el mismo temporizador de 3 s y cierra la lista; no reconsulta, la lista se reabre con el siguiente cambio de texto;
   - si `stock <= 0`: `setError` con el mensaje de stock insuficiente actual (`Stock insuficiente. Disponible: 0`), cierra la lista, no abre el diálogo a granel;
   - si no, llama al `handleProductSelected` existente con el producto leído.
4. **Limpieza**: al agregarse el producto (también tras confirmar el diálogo a granel) se limpia `barcodeInput`, se cierra la lista y se enfoca el campo. Hoy `addToCart` limpia solo `searchTerm`; esta unidad agrega la limpieza de `barcodeInput` en ese punto. Si se cancela el diálogo a granel, el texto se conserva.
5. **Cierre** (L7): Esc, Tab, texto de menos de 3 caracteres, clic fuera (`ClickAwayListener`), `onBlur` del campo y `suggestionsEnabled` en `false`. El contenedor `listbox` completo (filas y barra de scroll) usa `onMouseDown` con `preventDefault()`, para que ni un clic en una fila ni un arrastre de la barra de scroll quiten el foco al campo y cierren la lista (AC1.3 con el ratón).
6. **Corrección de dependencias**: `handleBarcodeSubmit` es un `useCallback` con dependencias incompletas (solo `barcodeInput`) y usa `handleProductSelected`, que a su vez usa el carrito. Se completan las dependencias para evitar un carrito desactualizado, sin cambiar el comportamiento.
7. **Se conserva** el efecto que devuelve el foco al campo cuando cambia el carrito (el escáner depende de él).

### Accesibilidad (NFR6)

| Requisito | Implementación |
|---|---|
| Rol | Campo `role="combobox"` con `aria-expanded`, `aria-controls` hacia la lista, `aria-autocomplete="list"` y `aria-activedescendant` hacia la fila resaltada |
| Etiqueta | `aria-label="Escanear o buscar producto por nombre o código"` |
| Foco | El foco nunca sale del campo mientras se navega la lista; después de agregar vuelve al campo |
| Anuncios | Región `aria-live="polite"` que anuncia "N sugerencias" o "Sin coincidencias" al actualizar |

## ProductSuggestionList (nuevo)

Componente presentacional: no consulta ni decide, solo dibuja.

### Propiedades

| Propiedad | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `suggestions` | `Product[]` | sí | resultados a mostrar (hasta 10) |
| `status` | `'loading' \| 'ready' \| 'empty'` | sí | `error` e `idle` no dibujan la lista |
| `highlightedIndex` | `number \| null` | sí | fila resaltada |
| `listId` | `string` | sí | id para `aria-controls` |
| `anchorEl` | `HTMLElement \| null` | sí | ancla del `Popper`; el ancho de la lista es el del campo |
| `onSelect` | `(product: Product) => void` | sí | clic en una fila |

### Presentación

- `Popper` anclado bajo el campo (la tarjeta de la barra recorta el contenido desbordado, así que la lista no vive dentro de ella), con `zIndex` sobre la tabla del carrito.
- Contenedor `role="listbox"` con altura máxima de 3 filas y scroll propio. El resaltado usa `scrollIntoView({ block: 'nearest' })`.
- Cada fila `role="option"` con `id`, `aria-selected` y `aria-disabled` si está agotada: nombre, código, precio con `formatCurrency` y stock con unidad (los montos usan los helpers de precisión existentes, NFR5), y chips "A granel" y "Agotado" (texto, no solo color).
- `loading`: solo la barra de progreso lineal de 2 px bajo el campo; no se dibujan filas (las anteriores son de otro texto y no se pueden resaltar ni elegir).
- `empty`: una fila no seleccionable "Sin coincidencias".
- Fila con `data-testid="product-suggestion-<id>"` y lista con `data-testid="product-suggestion-list"` para pruebas.

## useProductSuggestions (nuevo)

```text
entrada: term (texto), enabled (booleano)
salida:  suggestions (lista de Product), status ('idle'|'loading'|'ready'|'empty'|'error'),
         errorMessage (texto o nulo), announcement (texto para la región en vivo)
```

- Aplica la regla L1: sin `enabled` o con menos de 3 caracteres recortados, el estado es `idle` y se invalida la secuencia.
- Espera 200 ms sin cambios de texto; cada consulta incrementa un contador de secuencia y solo se aplica la respuesta cuyo número coincide con el actual (L4). Al desmontarse el componente se invalida la secuencia.
- Llama a `ProductService.suggest(term, 10)`. Una falla pasa a `error` con el mensaje limpio (el `CleanError` existente) y `PosSearchBar` lo muestra con `setError`, con la limpieza de 3 s de los demás errores del POS y sin repetir el mismo mensaje mientras siga visible.
- Expone `closeAndInvalidate()` para el cierre síncrono de Enter y para los cierres de L7.
- La transición de estado vive en un reductor puro dentro de `productSuggestions.ts`, para probarla sin DOM.

## productSuggestions.ts (nuevo, funciones puras)

| Función | Entrada | Salida |
|---|---|---|
| `shouldSuggest(term)` | texto | `true` si el texto recortado tiene 3 o más caracteres |
| `nextHighlight(current, key, count)` | índice actual o `null`, `'ArrowDown'` o `'ArrowUp'`, número de filas | nuevo índice o `null`; ↓ se detiene en la última, ↑ en la primera quita el resaltado |
| `decideEnter(highlightedIndex, listOpen, status)` | índice o `null`, booleano, estado del hook | `'select-highlighted'` solo con lista abierta, estado `ready` y fila resaltada; en cualquier otro caso (incluido `loading`) `'run-current-flow'` |
| `suggestionsReducer(state, event)` | estado y evento (`input-changed`, `request-started`, `response`, `failed`, `closed`) con secuencia | siguiente estado; descarta respuestas con secuencia vieja |
| `isOutOfStock(product)` | `Product` | `true` si `stock <= 0` |

## ProductService.suggest (nuevo)

`suggest(term: string, limit?: number): Promise<Product[]>` llama al comando `suggest_products` con `{ term, limit }`. U3 la llama sin `limit`.

## Validaciones y mensajes

| Situación | Mensaje o comportamiento |
|---|---|
| Menos de 3 caracteres | Sin lista (AC1.2) |
| Sin resultados | "Sin coincidencias" (AC1.9) |
| Producto agotado al elegirlo | "Stock insuficiente. Disponible: 0" (mensaje actual) |
| Producto ya no disponible al elegirlo | "Producto no encontrado" (mensaje actual) |
| Falla la consulta | `Alert` de error del POS; Enter sigue funcionando |

## Puntos de integración

- Backend: `suggest_products` (nuevo) y `get_product` (existente) a través de `ProductService`.
- `usePos`: `cart`, `dispatch` y `setError`, sin cambios.
- `handleProductSelected`, `addToCart` y `BulkQuantityDialog`: reutilizados tal cual, con el cambio de limpieza descrito arriba.
- U3: `suggestionsEnabled` desactiva la lista y su consulta.

## Sources

- `functional-spec.md` de esta unidad (flujos, reglas y contrato).
- `inception/refined-mockups/interaction-spec.md`: `PosSearchBar` (estados, teclado, accesibilidad).
- Código actual: `src/modules/pos/components/PosSearchBar.tsx`, `BulkQuantityDialog.tsx`, `PosProvider.tsx` y `ProductService.ts`.

## Assumptions & Open Questions

- [assumption] La lista se dibuja con `Popper` y `ClickAwayListener` de MUI, para escapar del recorte de la tarjeta de la barra.
- [assumption] El diálogo a granel conserva el texto de la barra hasta confirmarse, porque cancelar no agrega nada.
- [assumption] Se usa `getById` (`get_product`) para la relectura al elegir; no se agrega un comando nuevo.
