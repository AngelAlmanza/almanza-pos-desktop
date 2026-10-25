# Mapeo al sistema de diseño — "La Caja" + MUI 7

Cada elemento nuevo se construye con componentes de MUI 7 que ya están en el proyecto y con los tokens de `docs/interface-design/system.md`. No hacen falta librerías nuevas de UI ni iconos nuevos: los iconos salen de `@mui/icons-material`, que ya es dependencia.

## Componentes

| Elemento (ver `mockups.md`) | Componente MUI base | Reutiliza del proyecto | Tokens / estilos |
|---|---|---|---|
| Lista de sugerencias (M1) | `Popper` + `Paper` + `List` / `ListItemButton` (o `Autocomplete` en modo libre, según Functional Design) | Lógica de `handleProductSelected` / `addToCart` de `PosSearchBar` | Paper: borde `rgba(26,32,53,0.10)` y sombra de diálogo `0 16px 64px rgba(26,32,53,0.18)` reducida a `0 8px 24px` por ser flotante; fila resaltada `rgba(13,107,95,0.08)`; altura de fila 56 px |
| Chip "A granel" | `Chip` small outlined | El que ya está en el modal "Buscar Producto" | Contorno `primary` |
| Chip / etiqueta "Agotado" | `Chip` small | Patrón de chip de estado del sistema | Error: fondo `rgba(185,28,28,0.10)`, texto `error.dark`, `height: 20`, `borderRadius: 3` |
| Selector de vista (M1/M2) | `ToggleButtonGroup` small exclusivo + `Tooltip` | Uso de `ToggleButtonGroup` del diálogo de cobro | Seleccionado: fondo `rgba(13,107,95,0.10)` e icono `primary.main`; iconos `ViewList` y `ViewModule` |
| Barra de herramientas de la cuadrícula | `Stack` + `Typography` + `Select` small + `Button` text small | — | Contador en caption `text.secondary`; botón "↑ Asc / ↓ Desc" con iconos `ArrowUpward` y `ArrowDownward` |
| Encabezado de grupo sticky | `Typography` caption en un `Box` sticky | Estilo de "etiqueta de sección" del sistema | Mayúsculas, `letterSpacing: 0.06em`, `fontWeight: 600`, fondo `#f0ede8`, borde inferior `rgba(26,32,53,0.10)` |
| Cuadrícula | `Box` con `display: grid` | — | `gridTemplateColumns: repeat(auto-fill, minmax(176px, 1fr))`, `gap: 12px` (1.5 de espaciado) |
| Tarjeta de producto (M3) | `Card` + `CardActionArea` (ButtonBase) | Profundidad "solo bordes" | `boxShadow: none`, borde `1px solid rgba(26,32,53,0.10)`, hover con borde `primary.main` y fondo `rgba(13,107,95,0.04)` (tinte de fila de tabla) |
| Imagen de tarjeta | `CardMedia` / `Box component="img"` con `loading="lazy"` | — | Alto de 120 px, `objectFit: contain`, fondo `#faf9f6` (receipt warm) |
| Placeholder de imagen | `Box` + icono `Inventory2` | Estilo del recuadro "Sin logo" de `ImageField` | Fondo `rgba(26,32,53,0.04)`, icono `text.disabled` |
| Precio y stock en tarjeta y sugerencias | `Typography` | Elemento firma "tabular-nums"; `formatCurrency` | Precio en `primary`, peso 700, `fontVariantNumeric: tabular-nums` |
| Código de barras | `Typography` caption | Regla "Barcodes/codes: monospace" | `fontFamily: monospace`, `text.secondary` |
| Estados de la cuadrícula (M4) | `Skeleton`, `Alert` + `Button`, `Box` de vacío | Patrón de vacío de "No hay una caja abierta" en `POSPage` | Icono de 48 px `text.disabled`, texto `text.secondary` |
| Carrito compacto (M2) | `List` + `ListItem` + `IconButton` | Acciones de `SaleSummaryTable` y `BulkQuantityDialog` | Panel receipt `#faf9f6` con borde izquierdo de 3 px `primary.main` (sin cambio); ancho de 360 px en cuadrícula y 300 px en lista |
| Columna de imagen del formulario (M5/M6) | `Box` + `Button` outlined small + `Button` text error | Evolución de `settings/components/ImageField.tsx` (se agrega Quitar, el error y los estados pendientes) | Recuadro de 160×160, borde `rgba(26,32,53,0.10)`, `borderRadius: 1`; etiqueta de sección en caption mayúsculas |
| Diálogo de producto | `Dialog maxWidth="md"` | Acciones de diálogo del sistema (`px: 3, pb: 2.5, gap: 1`; Cancelar `inherit`, confirmar `contained`) | Sombra de diálogo del sistema |
| Indicador de guardado | `CircularProgress` de 16 px | Patrón de `ImageField` (`isSaving`) | — |

## Tokens nuevos

No se agregan tokens de color. Hay tres valores de transparencia de teal que ya existían dispersos en el código y que este trabajo vuelve a usar con nombre propio:

| Uso | Valor | Ya existe en |
|---|---|---|
| Hover de superficie | `rgba(13,107,95,0.04)` | Hover de fila de tabla (system.md) |
| Resaltado / seleccionado | `rgba(13,107,95,0.08)` | Fondo de "Total a cobrar" (`0.06`) |
| Seleccionado fuerte | `rgba(13,107,95,0.10)` | Fondo del contenedor de icono de las tarjetas métricas |

Medidas de componente propuestas para documentar en `system.md` cuando se implementen:

- Tarjeta de producto POS: ancho mínimo de 176 px, alto de 236 px y área de imagen de 120 px.
- Fila de sugerencia: 56 px; lista con 3 filas visibles.
- Columna derecha del POS: 300 px en lista y 360 px en cuadrícula.
- Vista previa de imagen de producto: 160×160 px (96×96 en ventanas angostas).

## Consistencia con el sistema

- **Profundidad**: tarjetas y lista de sugerencias usan solo bordes; la sombra se reserva para lo que flota (la lista y los diálogos).
- **Cifras**: precio, stock, contador y total siempre en `tabular-nums`.
- **Estados de color**: "Agotado" usa el chip de error del sistema y siempre lleva texto, nunca solo color.
- **Botones**: `textTransform: none`, peso 600, sin sombra; acciones de diálogo según el patrón existente.
- **Textos de UI**: en español, como el resto de la aplicación.

## Sources

- `docs/interface-design/system.md` (paleta, profundidad, tipografía, chips, diálogo, vacíos).
- `mockups.md` M1–M6 e `interaction-spec.md`.
- `requirements.md` FR1–FR4.
- Código actual: `src/modules/settings/components/ImageField.tsx`, `src/modules/pos/pages/POSPage.tsx`, `src/modules/pos/components/PosSearchBar.tsx`, `src/modules/pos/components/SaleSummaryTable.tsx`.

## Assumptions & Open Questions

- [assumption] La lista de sugerencias puede construirse con `Popper` + `List` o con `Autocomplete` de MUI. Lo que se exige es el comportamiento de `interaction-spec.md`, en particular que Enter sin resaltado conserve el flujo actual; si `Autocomplete` no lo permite sin trucos, se usa `Popper`. Se decide en Functional Design.
- [assumption] El icono de placeholder es `Inventory2` (caja), consistente con un catálogo de abarrotes.
