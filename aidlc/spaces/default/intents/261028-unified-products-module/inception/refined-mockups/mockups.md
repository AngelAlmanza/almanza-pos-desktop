# Bocetos Refinados — Módulo de Productos unificado

Fuentes: `inception/requirements-analysis/requirements.md` (FR1–FR10, NFR1–NFR7), respuestas de `refined-mockups-questions.md` ("RM Q<n>") y el estilo de la app en `docs/interface-design/system.md`. En Ideación no se hicieron bocetos, así que estos parten directo de los requisitos.

## Decisiones de diseño

| Decisión | Elección | Origen |
|----------|----------|--------|
| Organización | Columna de categorías a la izquierda y listado al centro; el historial completo va en una pestaña aparte | RM Q1 |
| Historial de un producto | Botón en la fila que abre el panel lateral del producto en su sección "Historial" (ver la comparación más abajo) | RM Q1 |
| Ajuste de stock | Panel lateral a la derecha | RM Q2 |
| Tipo de ajuste | Tres botones grandes con icono | RM Q3 |
| Acciones de la fila | "Ajustar stock" con texto; las demás como iconos con tooltip | RM Q4 |
| Resumen | Tres tarjetas; "Bajo" y "Agotado" filtran el listado al pulsarlas | RM Q5 |
| Ventana mínima | 1024 px | RM Q6 |
| Datos que se conservan | La descripción bajo el nombre; se quita la fecha de creación de las categorías | RM Q7 |

### Historial de un producto: opciones exploradas

Pediste explorar las opciones para ver el historial de un producto con un solo botón (RM Q1).

| Opción | A favor | En contra |
|--------|---------|-----------|
| **1. Sección "Historial" del panel lateral del producto (recomendada)** | Es el mismo panel del ajuste: todo lo de un producto vive en un solo lugar. Se ve el efecto de un ajuste recién hecho sin cerrar nada. El panel puede crecer a la ficha de producto (FR10) sin rediseño | El panel es angosto, así que el historial se muestra como lista y no como tabla ancha |
| 2. Diálogo (modal) | Espacio amplio para una tabla | Tapa el listado, y es otra ventana distinta de la del ajuste: dos patrones para el mismo producto |
| 3. Fila desplegable bajo el producto | Se ve en contexto sin ventanas | Empuja la tabla hacia abajo y, con muchos ajustes, la fila se vuelve enorme; es difícil de usar con teclado |

Se usa la opción 1. El historial del producto solo lo ve el administrador (FR1.3).

## M1. Vista "Productos" (administrador)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Productos                                                         [ + Nuevo producto ]   │
│ ┌─────────────┬────────────────────┐                                                     │
│ │ Productos ▔▔│ Historial de stock │                                                     │
│ └─────────────┴────────────────────┘                                                     │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐                     │
│ ┃ ACTIVOS            │ ┃ STOCK BAJO       ▸ │ ┃ AGOTADOS         ▸ │                     │
│ ┃ 128                │ ┃ 7                  │ ┃ 2                  │                     │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘                     │
│ ┌──────────────────────┐ ┌───────────────────────────────────────────────────────────┐  │
│ │ CATEGORÍAS        [+]│ │ Estado: (Todos) (Normal) (Bajo) (Agotado)  [ ] Mostrar inactivos │
│ │ ▸ Todas          128 │ ├───────────────────────────────────────────────────────────┤  │
│ │   Abarrotes       41 │ │ PRODUCTO         CÓDIGO     CATEGORÍA  PRECIO  STOCK   MÍN  ESTADO   ACCIONES        │
│ │   Lácteos         18 │ │ Leche entera 1L  750100… Lácteos    $28.50   3 pz   5  [Bajo]   [Ajustar stock] ⟲ ✎ ◐ 🗑 │
│ │   Salchichonería  12 │ │  Lala, caja                                                                          │
│ │   Bebidas         30 │ │ Jamón de pavo    —          Salchich.  $189.00 1.250 kg 2 [Bajo] [Ajustar stock] ⟲ ✎ ◐ 🗑 │
│ │   Sin categoría   27 │ │  A GRANEL · KG                                                                       │
│ │                      │ │ Refresco 600ml   750105… Bebidas    $18.00   0 pz  10 [Agotado][Ajustar stock] ⟲ ✎ ◐ 🗑 │
│ └──────────────────────┘ └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
⟲ Ver historial   ✎ Editar   ◐ Activar/Desactivar   🗑 Eliminar   (cada icono con tooltip)
```

- **Encabezado:** título "Productos" y botón principal "+ Nuevo producto" (FR3.1).
- **Pestañas:** "Productos" e "Historial de stock" (RM Q1, FR7.1).
- **Tarjetas de resumen (FR8):** "Activos" es informativa. "Stock bajo" y "Agotados" son botones: al pulsarlos se activa el filtro de estado correspondiente y se resalta la tarjeta. Así se ven los nombres de esos productos, como en el aviso de hoy (RM Q5).
- **Columna de categorías (RM Q1, FR6, FR9):** "Todas", cada categoría con su número de productos (según los filtros activos de estado e inactivos) y "Sin categoría" al final. Al pulsar una, filtra el listado. Para el administrador: "[+]" crea una categoría, y al pasar el cursor o enfocar una categoría aparecen editar y eliminar.
- **Filtros (FR9):** botones de estado de stock y el interruptor "Mostrar inactivos" (FR2.4). Se combinan con la categoría elegida.
- **Tabla (FR2.1):** nombre con la descripción debajo en texto secundario (RM Q7); la marca "A granel · KG" se muestra debajo cuando aplica. Código en monoespaciada; precio y stock en cifras tabulares. Estado como etiqueta con texto (FR2.3). No hay columna de imagen: hoy el listado no la tiene.
- **Acciones de la fila (RM Q4):** botón "Ajustar stock" con texto, y luego iconos con tooltip: Ver historial, Editar, Activar/Desactivar, Eliminar.
- **Producto inactivo** (con "Mostrar inactivos" encendido): la fila aparece atenuada, el estado dice "Inactivo" y no hay botón "Ajustar stock" (FR2.4, FR5.6).

## M1-C. Vista "Productos" (cajero)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Productos                                                                                │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐                     │
│ ┃ ACTIVOS  128       │ ┃ STOCK BAJO  7    ▸ │ ┃ AGOTADOS  2      ▸ │                     │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘                     │
│ ┌──────────────────────┐ ┌───────────────────────────────────────────────────────────┐  │
│ │ CATEGORÍAS           │ │ Estado: (Todos) (Normal) (Bajo) (Agotado)  [ ] Mostrar inactivos │
│ │ ▸ Todas          128 │ ├───────────────────────────────────────────────────────────┤  │
│ │   Abarrotes       41 │ │ PRODUCTO        CÓDIGO   CATEGORÍA  PRECIO  STOCK  MÍN  ESTADO   ACCIONES     │
│ │   …                  │ │ Leche entera 1L 750100…  Lácteos   $28.50   3 pz  5   [Bajo]   [Ajustar stock] │
│ └──────────────────────┘ └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Sin "+ Nuevo producto", sin pestaña "Historial de stock" y sin controles para administrar categorías; la columna de categorías solo filtra (FR1.3, FR1.4).
- La única acción de la fila es "Ajustar stock".

## M2. Panel lateral del producto (ajuste e historial)

Se abre a la derecha, encima del listado, con "Ajustar stock" (sección Ajustar) o con el icono ⟲ (sección Historial). El listado queda visible detrás, atenuado.

```text
                                        ┌──────────────────────────────────────────┐
                                        │ Leche entera 1L                       ✕  │
                                        │ 7501000000017 · Lácteos                  │
                                        │                                          │
                                        │ STOCK ACTUAL                             │
                                        │ 3 pz            [Bajo] (mínimo 5)        │
                                        │ ┌──────────┬───────────┐                 │
                                        │ │ Ajustar ▔│ Historial │   ← solo admin  │
                                        │ └──────────┴───────────┘                 │
                                        │ ¿Qué pasó?                               │
                                        │ ┌──────────┐┌──────────┐┌──────────┐     │
                                        │ │   📦     ││   ＋     ││   －     │     │
                                        │ │ Llegó    ││ Sobró al ││ Faltó al │     │
                                        │ │mercancía ││  contar  ││  contar  │     │
                                        │ └──────────┘└──────────┘└──────────┘     │
                                        │ Cantidad                                 │
                                        │ [ 10          ] pz                       │
                                        │ Motivo (opcional)                        │
                                        │ [ Compra a proveedor            ]        │
                                        │                                          │
                                        │ ┌──────────────────────────────────────┐ │
                                        │ │ Ahora 3 pz  →  Quedará 12 pz [Normal]│ │
                                        │ └──────────────────────────────────────┘ │
                                        │                                          │
                                        │              [ Cancelar ] [ Confirmar ]  │
                                        └──────────────────────────────────────────┘
```

- **Encabezado:** nombre, código y categoría; botón cerrar.
- **Stock actual:** cifra grande con su unidad, estado y mínimo (FR2.2).
- **Sección Ajustar (FR5):**
  - Tres botones grandes de opción única: "Llegó mercancía", "Sobró al contar", "Faltó al contar" (RM Q3, FR5.2). Ninguno viene elegido de antemano.
  - Cantidad: entero para productos por pieza; hasta 3 decimales para productos a granel, con su unidad al lado (FR5.3).
  - Motivo opcional.
  - Vista previa "Ahora → Quedará", con el estado que tendrá (FR5.4). Si el resultado es 0 o menos, la vista previa lo dice en texto ("Quedará 0 pz · Agotado").
  - "Confirmar" se habilita al elegir el tipo y una cantidad válida. Mientras guarda, el botón muestra "Guardando…" y no admite otro clic (FR5.7).
- **Sección Historial (solo administrador, FR7.2):** lista de ajustes del producto, del más reciente al más antiguo.

```text
                                        │ ┌──────────┬───────────┐                 │
                                        │ │ Ajustar  │ Historial▔│                 │
                                        │ └──────────┴───────────┘                 │
                                        │ 28 oct 2026 · 14:05 · Ana                │
                                        │ Llegó mercancía   +10 pz    3 → 13       │
                                        │ Compra a proveedor                       │
                                        │ ──────────────────────────────────────── │
                                        │ 20 oct 2026 · 09:12 · root               │
                                        │ Faltó al contar   −2 pz     5 → 3        │
                                        │ —                                        │
```

- Después de confirmar un ajuste, el panel sigue abierto: muestra el aviso "Ajuste guardado", el nuevo stock actual y el formulario vacío para otro ajuste. Detrás, el listado y las tarjetas ya muestran los valores nuevos (FR5.5, FR8.2).

## M3. Pestaña "Historial de stock" (solo administrador)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Productos                                                         [ + Nuevo producto ]   │
│ ┌───────────┬──────────────────────┐                                                     │
│ │ Productos │ Historial de stock ▔▔│                                                     │
│ └───────────┴──────────────────────┘                                                     │
│ Desde [ 01/10/2026 ]  Hasta [ 28/10/2026 ]                                               │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ FECHA            PRODUCTO         TIPO              CANTIDAD  ANTES  DESPUÉS  MOTIVO      USUARIO │
│ │ 28/10/26 14:05   Leche entera 1L  [Llegó mercancía] +10       3      13       Compra…     Ana     │
│ │ 20/10/26 09:12   Leche entera 1L  [Faltó al contar] −2        5      3        —           root    │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                         Filas por página [25 ▾]   1–2 de 2   ‹  ›    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Rango de fechas y paginación como hoy (FR7.1). Los tipos se muestran con los nombres nuevos, también en los ajustes antiguos (FR7.3).
- Pulsar el nombre de un producto abre su panel lateral en la sección Historial (FR7.2).

## M4. Diálogo "Nuevo producto" / "Editar producto" (administrador)

Los mismos campos y validaciones de hoy (FR3.1): nombre, descripción, código de barras, precio, unidad, "A granel", categoría (con "+ Nueva categoría" en la misma lista, FR3.2), stock inicial (solo al crear), stock mínimo e imagen.

```text
┌──────────────────────────────────────────────┐
│ Nuevo producto                            ✕  │
│ Nombre *          [                        ] │
│ Descripción       [                        ] │
│ Código de barras  [                        ] │
│ Precio *  [ $       ]   Unidad * [ Pieza ▾ ] │
│ [ ] A granel                                 │
│ Categoría [ Sin categoría            ▾ ]     │
│           (incluye "+ Nueva categoría")      │
│ Stock inicial [ 0 ]   Stock mínimo [ 0 ]     │
│ Imagen  [ Elegir imagen ]                    │
│                       [ Cancelar ] [ Crear ] │
└──────────────────────────────────────────────┘
```

- Si un dato no es válido, el error aparece bajo el campo y el formulario conserva lo escrito (FR3.3).

## M5. Categorías: crear, editar, eliminar (administrador)

- "[+]" de la columna y el icono de editar abren un diálogo pequeño con Nombre y Descripción (FR6.1).
- Eliminar abre una confirmación que dice el impacto (FR6.2):

```text
┌──────────────────────────────────────────────┐
│ ¿Eliminar la categoría "Lácteos"?            │
│ 18 productos quedarán sin categoría.         │
│ Los productos no se eliminan.                │
│                  [ Cancelar ] [ Eliminar ]   │
└──────────────────────────────────────────────┘
```

- Si la categoría eliminada era la seleccionada en la columna, la selección vuelve a "Todas".

## M6. Estados de pantalla

| Estado | Qué se ve | Requisito |
|--------|-----------|-----------|
| Cargando | Filas de esqueleto en la tabla y en la columna de categorías; las tarjetas muestran "—" | FR2.6 |
| Sin productos | En la tabla: "Aún no hay productos". El administrador ve también el botón "+ Nuevo producto" | FR2.6 |
| Error al cargar | Aviso de error en lenguaje simple con el botón "Reintentar"; distinto del vacío | FR2.6 |
| Filtro sin resultados | "Ningún producto coincide con estos filtros" y el botón "Quitar filtros" | FR9.2 |
| Historial sin ajustes | "Sin ajustes en estas fechas" (pestaña) o "Este producto aún no tiene ajustes" (panel) | FR7.4 |
| Error al guardar un ajuste | El panel sigue abierto con lo escrito y un aviso de error arriba del botón "Confirmar" | FR5, FR3.3 |
| Un solo producto | La tabla y las tarjetas funcionan igual; las cifras usan singular cuando corresponde ("1 producto") | — |
| Nombre o descripción muy largos | Se cortan con "…" en la tabla y se ven completos en el tooltip y en el panel | — |

## M7. Ventanas de 1024 a 1279 px

- Se ocultan las columnas "Código" y "Mín."; el código sigue visible en el panel lateral y el mínimo en la etiqueta de estado del panel.
- La columna de categorías se angosta a 200 px y los nombres largos se cortan con "…".
- El panel lateral ocupa 400 px y se dibuja encima del listado.
- Por debajo de 1024 px el módulo no se adapta más (RM Q6).

## Assumptions & Open Questions

- [assumption] Si un ajuste "Faltó al contar" puede dejar el stock negativo, se conserva la regla que el sistema aplica hoy (supuesto heredado de los requisitos); la vista previa muestra el resultado en cualquier caso.
