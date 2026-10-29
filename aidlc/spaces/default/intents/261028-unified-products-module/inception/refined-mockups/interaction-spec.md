# Especificación de Interacción — Módulo de Productos unificado

Fuentes: `mockups.md` (M1–M7), `inception/requirements-analysis/requirements.md` y `refined-mockups-questions.md` (RM Q1–Q7).

## Flujos de usuario

### F1. Ajustar stock (administrador o cajero)

- **Persona:** dueño o cajero.
- **Disparador:** pulsa "Ajustar stock" en la fila de un producto activo.
- **Pasos:**
  1. Listado → pulsa "Ajustar stock" → se abre el panel lateral en la sección Ajustar, con el foco en el primer botón de tipo.
  2. Panel → elige "Llegó mercancía", "Sobró al contar" o "Faltó al contar" → el foco pasa a Cantidad.
  3. Escribe la cantidad → la vista previa "Ahora → Quedará" se actualiza al escribir.
  4. Motivo opcional → pulsa "Confirmar" (o Enter) → "Guardando…" → aviso "Ajuste guardado", el stock actual del panel, el listado y las tarjetas se actualizan, y el formulario se vacía.
- **Resultado:** el producto muestra su nuevo stock y estado sin recargar (FR5.5).
- **Caminos de error:**
  - Cantidad vacía, 0, negativa, o con decimales en un producto por pieza → mensaje bajo el campo ("La cantidad debe ser mayor que 0", "Este producto se cuenta por piezas: usa números enteros") y "Confirmar" deshabilitado.
  - El guardado falla → el panel sigue abierto con lo escrito y el aviso de error en lenguaje simple; "Confirmar" vuelve a estar disponible.
  - El producto se desactivó en otra sesión → al guardar se muestra el error que devuelva el sistema y el listado se recarga.

### F2. Revisar faltantes

- **Disparador:** pulsa la tarjeta "Stock bajo" o "Agotados".
- **Pasos:** se activa el filtro de estado correspondiente, se resalta la tarjeta y el listado muestra solo esos productos. Pulsar la misma tarjeta otra vez, o "Todos", quita el filtro.
- **Resultado:** se ven los nombres de los productos bajos o agotados, como en el aviso actual (RM Q5).

### F3. Ver el historial de un producto (administrador)

- **Disparador:** icono ⟲ "Ver historial" en la fila, o el nombre del producto en la pestaña "Historial de stock".
- **Pasos:** se abre el panel lateral en la sección Historial y se cargan los ajustes del producto. La pestaña "Ajustar" está a un clic.
- **Error:** si la carga falla, aparece un aviso dentro de la sección con "Reintentar".

### F4. Dar de alta un producto (administrador)

- **Disparador:** "+ Nuevo producto".
- **Pasos:** se abre el diálogo con el foco en Nombre; si hay una categoría seleccionada en la columna, viene preseleccionada. Se completa y se pulsa "Crear" → el diálogo se cierra, aparece el aviso "Producto creado" y la fila nueva se resalta un momento.
- **Meta:** menos de 2 minutos para un usuario nuevo (NFR2).
- **Error:** el error aparece bajo el campo correspondiente y se conserva lo escrito (FR3.3). Mientras guarda, "Crear" no admite otro clic (FR3.4).

### F5. Administrar categorías (administrador)

- "[+]" → diálogo con Nombre y Descripción → "Crear" → la categoría aparece en la columna, ordenada por nombre.
- Editar (icono al pasar el cursor o enfocar) → el mismo diálogo, con los datos cargados.
- Eliminar → confirmación con el número de productos que quedarán sin categoría (FR6.2) → al confirmar, esos productos pasan a "Sin categoría" y los contadores se actualizan.
- Nombre repetido → error bajo el campo "Ya existe una categoría con ese nombre".

### F6. Historial completo (administrador)

- Pestaña "Historial de stock" → por defecto, los últimos 30 días → se cambian las fechas → la tabla se recarga y vuelve a la página 1, como hoy (FR7.1).

## Especificación de componentes

### Tarjeta de resumen (StockSummaryCard)

| Field | Value |
|---|---|
| Component | StockSummaryCard |
| Description | Muestra una cifra del resumen de stock; "Stock bajo" y "Agotados" funcionan como filtro |
| Category | display / navigation |

**States**

| State | Description | Trigger |
|---|---|---|
| default | Cifra y etiqueta | carga del listado |
| hover | Fondo con tinte suave (solo las que filtran) | cursor encima |
| focus | Contorno visible de 2 px | Tab |
| selected | Borde izquierdo más grueso y fondo con tinte; `aria-pressed="true"` | clic o Enter/Espacio |
| loading | Muestra "—" | cargando productos |

**Accessibility**

| Requirement | Implementation |
|---|---|
| ARIA role | `button` con `aria-pressed` para las que filtran; texto plano para "Activos" |
| Keyboard interaction | Tab para enfocar, Enter o Espacio para activar o quitar el filtro |
| Label / aria-label | "Stock bajo: 7 productos. Filtrar" |
| Contrast ratio | WCAG AA (4.5:1 texto, 3:1 componentes) |
| Screen reader | Al cambiar el filtro se anuncia "Mostrando 7 productos con stock bajo" (región `aria-live="polite"`) |
| Focus management | El foco permanece en la tarjeta |

### Columna de categorías (CategorySidebar)

| Field | Value |
|---|---|
| Component | CategorySidebar |
| Description | Lista de categorías con su conteo; filtra el listado y, para el administrador, permite administrarlas |
| Category | navigation |

**States**

| State | Description | Trigger |
|---|---|---|
| default | "Todas" seleccionada | carga |
| selected | Categoría resaltada en verde azulado | clic o Enter |
| hover/focus | Aparecen los iconos de editar y eliminar (solo administrador) | cursor o foco en la fila |
| loading | Filas de esqueleto | cargando categorías |
| empty | Solo "Todas" y "Sin categoría"; el administrador ve "[+] Nueva categoría" | sin categorías |

**Responsive Behaviour**

| Breakpoint | Behaviour |
|---|---|
| 1024–1279 px | Ancho 200 px, nombres cortados con "…" y tooltip |
| ≥1280 px | Ancho 240 px |

**Accessibility**

| Requirement | Implementation |
|---|---|
| ARIA role | `nav` con `aria-label="Categorías"`; cada categoría es un botón con `aria-current="true"` cuando está seleccionada |
| Keyboard interaction | Flechas arriba/abajo para moverse, Enter para seleccionar; Tab llega a editar/eliminar de la categoría enfocada |
| Label / aria-label | "Lácteos, 18 productos"; iconos "Editar Lácteos", "Eliminar Lácteos" |
| Screen reader | Se anuncia el número de productos mostrados al cambiar de categoría |

### Tabla de productos (ProductTable)

| Field | Value |
|---|---|
| Component | ProductTable |
| Description | Listado unificado con estado de stock y acciones por fila |
| Category | display |

**States**

| State | Description | Trigger |
|---|---|---|
| default | Filas ordenadas por nombre | carga |
| hover | Tinte verde azulado suave en la fila | cursor |
| inactive row | Fila atenuada, estado "Inactivo", sin "Ajustar stock" | "Mostrar inactivos" encendido |
| loading | 8 filas de esqueleto | carga |
| empty | "Aún no hay productos" (+ botón para el administrador) | sin productos |
| no results | "Ningún producto coincide con estos filtros" + "Quitar filtros" | filtros sin resultados |
| error | Aviso con "Reintentar" | la carga falla |

**Responsive Behaviour**

| Breakpoint | Behaviour |
|---|---|
| 1024–1279 px | Se ocultan "Código" y "Mín." |
| ≥1280 px | Todas las columnas |

**Accessibility**

| Requirement | Implementation |
|---|---|
| ARIA role | Tabla nativa con encabezados `th scope="col"` |
| Keyboard interaction | Tab recorre las acciones de cada fila en orden: Ajustar stock → Ver historial → Editar → Activar/Desactivar → Eliminar |
| Label / aria-label | Cada icono: "Editar Leche entera 1L", etc.; tooltip con el mismo texto (RM Q4) |
| Screen reader | La etiqueta de estado se lee como texto ("Bajo") |

### Panel lateral del producto (ProductSidePanel)

| Field | Value |
|---|---|
| Component | ProductSidePanel |
| Description | Ajuste de stock e historial de un producto, a la derecha del listado |
| Category | layout / input |

**States**

| State | Description | Trigger |
|---|---|---|
| closed | No visible | — |
| open: ajustar | Sección Ajustar activa | "Ajustar stock" |
| open: historial | Sección Historial activa (solo administrador) | icono ⟲ |
| saving | "Confirmar" muestra "Guardando…" y está deshabilitado | confirmar |
| saved | Aviso "Ajuste guardado" durante 5 s; formulario vacío | guardado correcto |
| error | Aviso arriba de "Confirmar"; se conserva lo escrito | el guardado falla |

**Props / Inputs**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| product | object | yes | — | Producto abierto |
| initialSection | "adjust" \| "history" | no | "adjust" | Sección al abrir |
| canViewHistory | boolean | yes | — | Falso para el cajero; oculta la sección Historial |
| onAdjusted | function | yes | — | Avisa al listado para actualizar stock y tarjetas |

**Responsive Behaviour**

| Breakpoint | Behaviour |
|---|---|
| 1024–1279 px | 400 px de ancho, encima del listado |
| ≥1280 px | 440 px de ancho, encima del listado |

**Accessibility**

| Requirement | Implementation |
|---|---|
| ARIA role | `dialog` con `aria-modal="true"` y `aria-labelledby` apuntando al nombre del producto |
| Keyboard interaction | Escape cierra; el foco queda atrapado dentro del panel mientras está abierto |
| Label / aria-label | Botones de tipo como grupo de opción única (`radiogroup`) con `aria-label="Tipo de ajuste"`; flechas para moverse entre tipos |
| Screen reader | La vista previa es región `aria-live="polite"` ("Quedará 12 piezas, estado normal"); "Ajuste guardado" se anuncia |
| Focus management | Al abrir: primer botón de tipo (o el primer ajuste del historial). Al cerrar: vuelve al botón que lo abrió |

### Botones de tipo de ajuste (AdjustmentTypePicker)

| Field | Value |
|---|---|
| Component | AdjustmentTypePicker |
| Description | Tres botones grandes de opción única con icono y texto |
| Category | input |

| State | Description | Trigger |
|---|---|---|
| default | Ninguno elegido | apertura del panel |
| selected | Borde y fondo verde azulado, icono de marca; `aria-checked="true"` | clic, Espacio o flechas |
| focus | Contorno visible de 2 px | Tab o flechas |

Mapeo fijo: "Llegó mercancía" → tipo actual Agregar; "Sobró al contar" → Ajuste positivo; "Faltó al contar" → Ajuste negativo (FR5.2). La vista previa suma en los dos primeros y resta en el tercero.

## Reglas de interacción generales

- Todo texto de acción usa verbos simples ("Ajustar stock", "Crear", "Eliminar"); los iconos siempre tienen tooltip y nombre accesible (RM Q4).
- Los avisos de éxito duran 5 s; los de error se quedan hasta que se cierran o se corrige la causa.
- Los filtros (categoría, estado, inactivos) se conservan al abrir y cerrar el panel, y al volver de la pestaña "Historial de stock" durante la misma visita al módulo.
- Las animaciones duran menos de 300 ms y se desactivan si el sistema pide reducir movimiento.

## Assumptions & Open Questions

None.
