# Correspondencia con el Sistema de Diseño — "La Caja"

Referencia: `docs/interface-design/system.md`. El módulo no introduce colores ni componentes fuera del sistema; los únicos componentes nuevos se arman con piezas de Material UI que la app ya usa.

## Componentes

| Elemento del boceto | Pieza existente | Reglas del sistema que aplica |
|---------------------|-----------------|-------------------------------|
| Encabezado "Productos" + "+ Nuevo producto" | `Typography h5` + `Button contained size="small"` | Botones `textTransform: none`, `fontWeight: 600`, sin sombra |
| Pestañas "Productos" / "Historial de stock" | `Tabs` / `Tab` (ya usados en Inventario) | Indicador en verde azulado primario |
| Tarjetas de resumen | Patrón Metric Card (Reportes, Cortes de Caja) | `borderLeft: 3px solid` con color de acento; cifra `h5` tabular; etiqueta caption en mayúsculas |
| Columna de categorías | `List` / `ListItemButton` dentro de un `Paper` con borde | Bordes `rgba(26,32,53,0.10)`, sin sombra; seleccionado `rgba(13,107,95,0.10)` con texto primario |
| Filtros de estado | `ToggleButtonGroup` exclusivo (ya usado en el POS) | Tamaño small; seleccionado en verde azulado |
| "Mostrar inactivos" | `Switch` + etiqueta | — |
| Tabla | `TableContainer` con `Paper elevation={0}` | Encabezado `#f5f3f0`, 0.7rem en mayúsculas; hover `rgba(13,107,95,0.04)`; código en monoespaciada; cifras tabulares |
| Etiqueta de estado | `Chip size="small"` con `sx` propio | Ver colores de estado abajo |
| Iconos de acción | `IconButton size="small"` dentro de `Tooltip` | Nombre accesible igual al tooltip |
| Panel lateral | `Drawer anchor="right"` temporal | Superficie `#ffffff`; sombra de diálogo `0 16px 64px rgba(26,32,53,0.18)` |
| Botones de tipo de ajuste | `ToggleButtonGroup` exclusivo con botones grandes (icono + texto) | Seleccionado: borde y fondo verde azulado suave |
| Vista previa "Ahora → Quedará" | `Box` con fondo recibo `#faf9f6` y `borderLeft: 3px solid primary` | Patrón Receipt Panel; cifras tabulares |
| Diálogos de producto y categoría | `Dialog` actuales | Acciones `px: 3, pb: 2.5, gap: 1`; Cancelar `color="inherit"`; confirmar `contained` |
| Confirmación de eliminar | `ConfirmModal` compartido | Botón de confirmar en rojo de error |
| Estados vacíos | Celda con `colSpan`, `py: 4`, `text.secondary` | Patrón Empty States |
| Esqueletos de carga | `Skeleton` de MUI | — |

## Colores de estado de stock

| Estado | Fondo | Texto | Token del sistema |
|--------|-------|-------|-------------------|
| Normal | `rgba(45,106,79,0.12)` | `success.dark` | Chip Success |
| Bajo | `rgba(193,125,17,0.12)` | `warning.dark` | Chip Warning (ámbar) |
| Agotado | `rgba(185,28,28,0.10)` | `error.dark` | Chip Error |
| Inactivo | `rgba(26,32,53,0.07)` | `text.secondary` | Chip Default |

Las tarjetas usan el mismo acento que su estado: "Activos" en verde azulado primario `#0d6b5f`, "Stock bajo" en ámbar `#c17d11` y "Agotados" en rojo `#b91c1c`.

## Iconos (Material Icons, ya incluidos)

| Uso | Icono |
|-----|-------|
| Llegó mercancía | `LocalShipping` |
| Sobró al contar | `AddCircleOutline` |
| Faltó al contar | `RemoveCircleOutline` |
| Ver historial | `History` |
| Editar | `Edit` |
| Activar / desactivar | `ToggleOn` / `ToggleOff` |
| Eliminar | `DeleteOutline` |

## Espaciado y tipografía

- Base de 8 px: separación entre tarjetas 16 px; entre la columna de categorías y la tabla, 16 px; padding interno del panel, 24 px.
- Stock actual del panel: `h4` tabular; nombres y descripciones con la tipografía de la tabla actual.

## Menú lateral

- La entrada "Productos" queda visible para administrador y cajero; se quitan "Categorías" e "Inventario" (FR1.1). El icono y la posición de "Productos" no cambian.

## Assumptions & Open Questions

None.
