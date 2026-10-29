# Lista de Accesibilidad — Módulo de Productos unificado

Nivel objetivo: WCAG 2.1 AA, en línea con NFR3 de `inception/requirements-analysis/requirements.md`. Cada punto se comprueba a mano antes de entregar.

## Perceptible

- [ ] Ningún estado se comunica solo con color: las etiquetas dicen "Normal", "Bajo", "Agotado" o "Inactivo" (FR2.3).
- [ ] El texto de las etiquetas de estado, de las tarjetas y de la tabla cumple 4.5:1 de contraste sobre su fondo.
- [ ] Los bordes de los botones de tipo de ajuste y el contorno de foco cumplen 3:1 de contraste.
- [ ] Los iconos de acción tienen nombre accesible ("Editar Leche entera 1L"); los iconos decorativos de los botones de tipo están ocultos para el lector de pantalla, porque el texto ya los nombra.
- [ ] Los nombres y descripciones cortados con "…" se pueden leer completos en el tooltip y en el panel.
- [ ] Con zoom al 200% en una ventana de 1024 px, todo el contenido sigue siendo alcanzable.

## Operable

- [ ] Todas las acciones se pueden hacer solo con teclado: filtros, tarjetas, categorías, acciones de fila, panel, diálogos y paginación.
- [ ] El orden de tabulación sigue el visual: encabezado → pestañas → tarjetas → categorías → filtros → tabla → paginación.
- [ ] El contorno de foco es visible en cada elemento interactivo (al menos 2 px).
- [ ] El panel lateral atrapa el foco mientras está abierto; Escape lo cierra y el foco vuelve al botón que lo abrió.
- [ ] Los botones de tipo de ajuste funcionan como grupo de opción única: flechas para moverse, Espacio para elegir.
- [ ] Enter en "Cantidad" confirma el ajuste cuando el formulario es válido.
- [ ] Los diálogos se cierran con Escape, excepto la confirmación de eliminar, que exige una elección explícita.
- [ ] No hay límites de tiempo; los avisos de éxito desaparecen a los 5 s pero también se anuncian.

## Comprensible

- [ ] Cada campo tiene etiqueta visible arriba del campo, no solo un texto de ejemplo.
- [ ] Los errores dicen qué campo y cómo corregirlo, debajo del campo, y se conserva lo escrito (FR3.3).
- [ ] Las confirmaciones destructivas dicen el impacto ("18 productos quedarán sin categoría") (FR6.2).
- [ ] Los textos usan palabras de uso diario en español (NFR7); no se muestran códigos de error técnicos.
- [ ] Las acciones están en el mismo lugar y con el mismo nombre en todas las filas.

## Robusto

- [ ] La tabla usa encabezados de columna reales.
- [ ] La columna de categorías es una región de navegación con nombre ("Categorías") y marca la categoría actual.
- [ ] El panel lateral se anuncia como diálogo con el nombre del producto.
- [ ] Los cambios dinámicos se anuncian con regiones `aria-live="polite"`: el resultado de un filtro, la vista previa del ajuste y "Ajuste guardado".

## Movimiento

- [ ] Las animaciones del panel y de los avisos duran menos de 300 ms y se desactivan si el sistema pide reducir movimiento.

## Assumptions & Open Questions

None.
