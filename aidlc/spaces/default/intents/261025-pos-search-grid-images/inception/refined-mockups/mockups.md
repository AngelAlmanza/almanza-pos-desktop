# Mockups refinados — POS con sugerencias y cuadrícula, imagen de producto

Estos mockups parten de las pantallas que ya existen (`POSPage.tsx`, `PosSearchBar.tsx`, `SaleSummaryTable.tsx` y el diálogo de `ProductsPage.tsx`) y de `requirements.md`. Este plan no incluye etapas de wireframes ni flujos previos (rough mockups), así que el diseño sale directamente de los requisitos y de las respuestas en `refined-mockups-questions.md`. Las medidas están en px y siguen el sistema "La Caja" (`docs/interface-design/system.md`). El detalle de comportamiento de cada componente está en `interaction-spec.md`.

Pantallas cubiertas:

| ID | Pantalla / estado | Requisitos |
|---|---|---|
| M1 | POS, vista de lista, con sugerencias abiertas | FR1, FR2.1, FR3 |
| M2 | POS, vista de cuadrícula | FR2, FR3, FR1 (P2 = sin sugerencias) |
| M3 | Tarjeta de producto y sus estados | FR2.3, FR2.9, FR4.12 |
| M4 | Estados de la cuadrícula: cargando, error y vacíos | FR2.10 |
| M5 | Diálogo Nuevo/Editar producto con imagen | FR4 |
| M6 | Estados del campo de imagen | FR4.4, FR4.5, FR4.8, FR4.12 |

---

## M1 — POS en vista de lista, con sugerencias abiertas

La distribución actual se mantiene: panel izquierdo flexible y panel derecho "Resumen de Venta" de 300 px. Hay dos cambios:
- el selector de vista **Lista / Cuadrícula** se agrega dentro de la tarjeta de la barra de búsqueda, a la derecha del campo;
- la **lista de sugerencias** aparece flotando bajo la barra y tapa parcialmente la tabla del carrito, sin desplazarla.

```text
┌──────────────────────────────────────────────────────────────────────┬───────────────────────────┐
│ [Alert de error / éxito / aviso, como hoy]                           │ RESUMEN DE VENTA          │
│ ┌──────────────────────────────────────────────────────────────────┐ │                           │
│ │ [▣] jamo|                                         [🔍] │ [☰][▦] │ │ Artículos            3    │
│ └──────────────────────────────────────────────────────────────────┘ │ T/C USD          $17.50   │
│ ┌──────────────────────────────────────────────────────────────┐     │                           │
│ │ ▸ Jamón de pavo FUD 250 g           $54.00 · Stock 12 pza    │◀ 1  │ ───────────────────────── │
│ │   7501000000011                                              │     │ TOTAL                     │
│ │   Jamón serrano a granel            $320.00 · Stock 3.250 kg │  2  │ $186.50                   │
│ │   7501000000028                                   A granel   │     │ ≈ $10.66 USD              │
│ │   Jamón york San Rafael             $68.00 · Agotado         │  3  │                           │
│ │   7501000000035                                   (atenuada) │ ▲▼  │                           │
│ │                                                  3 de 7  ⋮   │ scr │                           │
│ └──────────────────────────────────────────────────────────────┘     │                           │
│ ┌──────────────────────────────────────────────────────────────────┐ │                           │
│ │ PRODUCTO          COMPRÓ        PRECIO BASE        TOTAL         │ │                           │
│ │ (tabla del carrito actual, sin cambios)                          │ │ [  💳  Cobrar  ]          │
│ └──────────────────────────────────────────────────────────────────┘ │ Reimprimir último ticket  │
└──────────────────────────────────────────────────────────────────────┴───────────────────────────┘
  ☰ = Lista (seleccionado)   ▦ = Cuadrícula   ▸ = sugerencia resaltada con ↑/↓
```

Anotaciones:
- **Lista de sugerencias**:
  - ancho igual al del campo de texto, hasta 10 elementos con 3 visibles (FR1.3) y una altura de 3 filas de 56 px (168 px más el pie de 24 px);
  - cada fila tiene dos líneas: el **nombre** (body2, peso 600) con precio y stock alineados a la derecha (tabular-nums), y debajo el **código** (monospace, caption) con el chip "A granel" cuando aplica (FR1.4);
  - el pie "3 de 7" indica cuántos resultados hay y se anuncia a lectores de pantalla.
- **Fila "Agotado"**: opacidad 0.55 y la etiqueta de texto "Agotado" en lugar del stock (FR1.8). Se puede resaltar con el teclado, pero elegirla muestra el error de stock.
- **"Sin coincidencias"**: una sola fila con texto secundario centrado (FR1.9).
- El **modal "Buscar Producto"** (varias coincidencias con Enter) y el **diálogo de granel** no cambian (FR1.12).
- **Selector de vista**: `ToggleButtonGroup` pequeño, exclusivo, con los iconos `ViewList` y `ViewModule` y su tooltip ("Vista de lista" / "Vista de cuadrícula").

---

## M2 — POS en vista de cuadrícula (P1 = B, P2 = A, P3 = B, P4 = A)

La cuadrícula ocupa todo el panel izquierdo. El carrito pasa a la columna derecha, que se ensancha de 300 a **360 px**, encima del total y del botón Cobrar. La lista de sugerencias **no aparece** en esta vista: la barra solo filtra las tarjetas, y Enter conserva el flujo actual de escáner, coincidencias y modal (P2 = A).

```text
┌──────────────────────────────────────────────────────────────┬─────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐ │ VENTA ACTUAL               3    │
│ │ [▣] ali|                                  [🔍] │ [☰][▦] │ │ ┌─────────────────────────────┐ │
│ └──────────────────────────────────────────────────────────┘ │ │ Alimento perro 1 kg   [🗑]  │ │
│  14 productos · Ordenar por [Nombre ▾] [↑ Asc]               │ │ [−] 2 [+]          $96.00   │ │
│ ┌──────────────────────────────────────────────────────────┐ │ ├─────────────────────────────┤ │
│ │ ABARROTES · 6                       (encabezado sticky)  │ │ │ Frijol a granel       [🗑]  │ │
│ ├──────────────────────────────────────────────────────────┤ │ │ 1.5 kg  [Editar]   $42.00   │ │
│ │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │ │ ├─────────────────────────────┤ │
│ │ │ [img]  │ │ [img]  │ │ [ 🛒 ] │ │ [img]  │              │ │ │ Coca-Cola 600 ml      [🗑]  │ │
│ │ │        │ │        │ │ placeh.│ │ AGOTADO│              │ │ │ [−] 1 [+]          $18.50   │ │
│ │ │Alimento│ │Alimento│ │Alimento│ │Alimento│              │ │ └─────────────────────────────┘ │
│ │ │perro 1k│ │gato 1kg│ │ave 500g│ │pez 100g│              │ │  (lista con scroll propio)      │
│ │ │7501…01 │ │7501…02 │ │7501…03 │ │7501…04 │              │ │ ─────────────────────────────── │
│ │ │$48.00  │ │$52.00  │ │$31.50  │ │$22.00  │              │ │ Artículos                  4.5  │
│ │ │Stock 12│ │Stock 4 │ │Stock 30│ │Agotado │              │ │ T/C USD                 $17.50  │
│ │ └────────┘ └────────┘ └────────┘ └────────┘              │ │ TOTAL                           │
│ │ ...                                                      │ │ $156.50                         │
│ │ BEBIDAS · 3                                              │ │ ≈ $8.94 USD                     │
│ │ ...                                                      │ │ [  💳  Cobrar  ]                │
│ │ SIN CATEGORÍA · 1                                        │ │ Reimprimir último ticket        │
│ └──────────────────────────────────────────────────────────┘ │                                 │
└──────────────────────────────────────────────────────────────┴─────────────────────────────────┘
```

Anotaciones:
- **Barra de herramientas** sobre la cuadrícula:
  - contador "N productos" (o "N de M productos" cuando hay filtro);
  - "Ordenar por" con `Select` pequeño: Nombre, Precio o Stock;
  - botón de dirección que alterna "↑ Asc" / "↓ Desc" (FR2.5).

  El orden elegido no se recuerda entre visitas al POS (supuesto de requisitos).
- **Cuadrícula** en CSS grid `repeat(auto-fill, minmax(176px, 1fr))` con espacio de 12 px:
  - a **1366 px** (ventana de la app con el menú lateral de 252 px), el panel izquierdo mide unos 680 px y caben **3 tarjetas** por fila;
  - a **1920 px** caben **6**;
  - con el menú lateral contraído (vista móvil o tableta) caben 4.
- **Encabezado de grupo**:
  - formato "NOMBRE CATEGORÍA · n", con caption en mayúsculas, letter-spacing 0.06em, peso 600 y color `text.secondary`;
  - fondo `#f0ede8` y borde inferior de divisor;
  - `position: sticky; top: 0` dentro del contenedor con scroll (P4 = A);
  - orden de los grupos: alfabético, con "Sin categoría" al final (FR2.4). Los grupos sin coincidencias no se muestran (FR2.7).
- **Carrito compacto** ("Venta actual"):
  - es el mismo carrito del `PosProvider`, presentado en filas de 2 líneas;
  - mantiene las mismas acciones que la tabla: −/+ para productos por pieza, "Editar" (abre el diálogo de granel actual) para productos a granel, y eliminar;
  - tiene scroll propio y el bloque de total y Cobrar queda fijo abajo;
  - vacío muestra "Toca un producto para agregarlo".
- **Avisos** (error, éxito, aviso): se muestran arriba del panel izquierdo, igual que hoy.
- Al tocar una tarjeta, la partida nueva o actualizada del carrito se resalta brevemente (fondo teal al 8 %, 600 ms; sin animación si el sistema pide movimiento reducido).

---

## M3 — Tarjeta de producto (P3 = B, medianas)

```text
 Normal                 Hover / foco            A granel               Agotado               Sin imagen
┌──────────────┐      ┏━━━━━━━━━━━━━━┓      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│              │      ┃              ┃      │              │      │░░░░░░░░░░░░░░│      │              │
│   [imagen]   │      ┃   [imagen]   ┃      │   [imagen]   │      │░░[imagen]░░░░│      │   [ 🛒 ]     │
│  120 px alto │      ┃              ┃      │   A GRANEL   │      │░░ AGOTADO ░░░│      │ (placeholder)│
├──────────────┤      ┣━━━━━━━━━━━━━━┫      ├──────────────┤      ├──────────────┤      ├──────────────┤
│Jamón de pavo │      ┃Jamón de pavo ┃      │Frijol negro  │      │Jamón york    │      │Vela aromática│
│FUD 250 g     │      ┃FUD 250 g     ┃      │a granel      │      │San Rafael    │      │              │
│7501000000011 │      ┃7501000000011 ┃      │7501000000042 │      │7501000000035 │      │Sin código    │
│$54.00   12pza│      ┃$54.00   12pza┃      │$28.00 3.250kg│      │$68.00 Agotado│      │$15.00   8 pza│
└──────────────┘      ┗━━━━━━━━━━━━━━┛      └──────────────┘      └──────────────┘      └──────────────┘
```

- **Tamaño**: mínimo 176 px y hasta 1fr de ancho; alto fijo de 236 px.
  - Área de imagen de **120 px** de alto, `object-fit: contain` sobre fondo `#faf9f6`.
  - Cuerpo con padding de 12 px.
- **Contenido** (FR2.3):
  - **nombre**: body2, peso 600, máximo 2 líneas con elipsis y el nombre completo en el `title` y el `aria-label`;
  - **código**: monospace, caption, `text.secondary`, 1 línea con elipsis; sin código muestra "Sin código" en `text.disabled`;
  - **precio**: subtitle2, peso 700, color `primary`, tabular-nums, formato con `formatCurrency`;
  - **stock**: caption, tabular-nums, con su unidad ("12 pza", "3.250 kg").
- **Agotado** (FR2.9):
  - opacidad 0.55 en todo el contenido y chip "Agotado" (estilo de chip de error del sistema) sobre la imagen;
  - el texto de stock cambia a "Agotado";
  - `aria-disabled="true"` y cursor `not-allowed`.
- **A granel**: chip "A granel" (contorno teal) en la esquina superior izquierda de la imagen.
- **Placeholder** (FR4.12): icono `Inventory2` de 48 px en `text.disabled`, centrado sobre `rgba(26,32,53,0.04)`. Se usa también cuando la imagen falla al cargar (evento `onError`).
- **Borde y profundidad**: `1px solid rgba(26,32,53,0.10)`, sin sombra (estrategia "solo bordes").
  - Hover: borde `primary.main` y fondo `rgba(13,107,95,0.04)`.
  - Foco con teclado: contorno de 2 px `primary.main` con offset de 2 px.

---

## M4 — Estados de la cuadrícula

```text
 Cargando                               Error al cargar
┌───────────────────────────────┐      ┌────────────────────────────────────────────┐
│ ▒▒▒▒▒▒  (encabezado esqueleto)│      │  ⚠ No se pudieron cargar los productos.     │
│ ┌────┐ ┌────┐ ┌────┐          │      │    <mensaje del sistema>                    │
│ │▒▒▒▒│ │▒▒▒▒│ │▒▒▒▒│ skeleton │      │                    [ Reintentar ]           │
│ └────┘ └────┘ └────┘ x6       │      └────────────────────────────────────────────┘
└───────────────────────────────┘

 Sin productos activos                    Sin coincidencias
┌────────────────────────────────────┐   ┌──────────────────────────────────────────────┐
│          [📦] (48 px, disabled)    │   │        [🔍] Sin coincidencias para «zzzz»     │
│  No hay productos activos.         │   │  Revisa lo que escribiste o borra la búsqueda │
│  Da de alta productos en Catálogo. │   │              [ Limpiar búsqueda ]             │
└────────────────────────────────────┘   └──────────────────────────────────────────────┘
```

- **Cargando**: `Skeleton` de MUI con 6 tarjetas y un encabezado.
- **Error**: `Alert` severity error con un botón "Reintentar" (FR2.10).
- **Vacíos**: un icono, una frase y la siguiente acción. "Limpiar búsqueda" vacía la barra y le devuelve el foco.

---

## M5 — Diálogo Nuevo/Editar producto con imagen (P5 = C)

El diálogo pasa de `maxWidth="sm"` (600 px) a **`md` (900 px)**. Queda en dos columnas: los campos actuales a la izquierda, sin cambios de orden ni de validación, y a la derecha una columna de 200 px con la imagen.

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Editar Producto                                                                   │
├──────────────────────────────────────────────────────────────┬────────────────────┤
│ Nombre *        [Jamón de pavo FUD 250 g                   ] │ IMAGEN (opcional)  │
│ Descripción     [                                          ] │ ┌────────────────┐ │
│                 [                                          ] │ │                │ │
│ Código de barras[7501000000011                             ] │ │    [imagen]    │ │
│ Precio *  [54.00        ]   Unidad [pza ▾]                   │ │   160 × 160    │ │
│ ┌──────────────────────────────────────────────────────────┐ │ │                │ │
│ │ (o) Producto a granel                                    │ │ └────────────────┘ │
│ │     Permite capturar la venta por pza, subunidad o monto │ │ [⬆ Cambiar imagen] │
│ └──────────────────────────────────────────────────────────┘ │ [🗑 Quitar imagen] │
│ Categoría       [Salchichonería ▾                          ] │ PNG, JPG o WebP.   │
│ Stock mínimo    [5                                         ] │ Máximo 5 MB.       │
├──────────────────────────────────────────────────────────────┴────────────────────┤
│                                                         Cancelar   [ Guardar ]    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

- **Columna de imagen**: encabezado "IMAGEN (opcional)" como etiqueta de sección (caption en mayúsculas).
  - Recuadro de 160×160 px con borde de 1 px y `object-fit: contain`.
  - Botones de ancho completo, `size="small"`, `variant="outlined"`:
    - **"Elegir imagen"** (sin imagen) o **"Cambiar imagen"** (con imagen);
    - **"Quitar imagen"** en color error con variante texto, visible solo cuando hay imagen.
  - Debajo, la ayuda fija "PNG, JPG o WebP. Máximo 5 MB." en caption.
- **Elegir o cambiar**: abre el selector nativo con el filtro "Imágenes (png, jpg, jpeg, webp)" (FR4.2). La vista previa cambia de inmediato, pero **no se copia nada hasta Guardar** (FR4.6, FR4.7).
- **Imagen pendiente**: mientras haya una imagen nueva o un "quitar" sin guardar, se muestra el caption "Se aplicará al guardar".
- **Guardar**: el botón muestra un `CircularProgress` de 16 px y se deshabilita mientras se guarda, para evitar el doble envío.
- **Vista angosta** (<900 px): la columna de imagen pasa arriba de los campos como fila horizontal (recuadro de 96 px y botones al lado).

---

## M6 — Estados del campo de imagen

```text
 Sin imagen              Con imagen guardada        Imagen nueva sin guardar     Error de validación
┌────────────────┐      ┌────────────────┐         ┌────────────────┐           ┌────────────────┐
│    [ 🛒 ]      │      │   [imagen]     │         │  [nueva img]   │           │    [ 🛒 ]      │
│  Sin imagen    │      │                │         │                │           │  Sin imagen    │
└────────────────┘      └────────────────┘         └────────────────┘           └────────────────┘
[⬆ Elegir imagen]       [⬆ Cambiar imagen]          [⬆ Cambiar imagen]           [⬆ Elegir imagen]
                        [🗑 Quitar imagen]          [🗑 Quitar imagen]            ⚠ La imagen pesa 6.2 MB.
                                                     Se aplicará al guardar         El máximo es 5 MB.

 Quitada sin guardar             Archivo guardado no encontrado
┌────────────────┐              ┌────────────────┐
│    [ 🛒 ]      │              │    [ 🛒 ]      │
│  Sin imagen    │              │  Sin imagen    │
└────────────────┘              └────────────────┘
[⬆ Elegir imagen]                [⬆ Elegir imagen]
 Se quitará al guardar  [Deshacer]  ⓘ No se encontró la imagen guardada.
```

- **Error de validación** (FR4.4): el texto va bajo los botones en `error.main`, con un icono y el motivo concreto: formato no permitido, más de 5 MB, archivo dañado o que no se puede leer, o sin permiso de lectura. El resto del formulario se conserva y la imagen anterior, si había, sigue sin cambios.
- **Quitar** (FR4.8): no pide confirmación porque es reversible hasta guardar. Ofrece "Deshacer" mientras el diálogo siga abierto.
- **Archivo faltante** (FR4.12): se muestra el placeholder con una nota informativa; se puede elegir otra imagen o guardar sin imagen.

---

## Requisitos sin representación visual propia

- **FR3** (preferencia por sesión): no tiene pantalla. El efecto visible es que el POS abre en la última vista elegida. El comportamiento está en `interaction-spec.md` § "Preferencia de vista".
- **FR4.10** (borrar la copia al eliminar el producto) y **FR4.11** (no tocar el archivo original): comportamiento del backend, sin cambios en la confirmación actual "¿Estás seguro de querer eliminar este producto?".

## Sources

- Initial description: la descripción original del usuario (`project-description.json`), con la vista de cuadrícula alternable, las tarjetas con foto, nombre, código, stock y precio, y la imagen opcional y removible.
- `requirements.md` (FR1–FR4, NFR2, NFR3, NFR6).
- `refined-mockups-questions.md`: Q1 = B (carrito en columna derecha), Q2 = A (sin sugerencias en cuadrícula), Q3 = B (tarjetas medianas), Q4 = A (encabezados fijos), Q5 = C (columna derecha de 160 px en el formulario).
- Pantallas existentes: `src/modules/pos/pages/POSPage.tsx`, `src/modules/pos/components/PosSearchBar.tsx`, `src/modules/pos/components/SaleSummaryTable.tsx`, `src/modules/catalog/products/pages/ProductsPage.tsx`, `src/modules/settings/components/ImageField.tsx`.
- Sistema de diseño: `docs/interface-design/system.md`.

## Assumptions & Open Questions

- [assumption] La columna derecha de 360 px en cuadrícula deja unos 680 px para las tarjetas en una pantalla de 1366 px con el menú lateral abierto; eso da 3 tarjetas medianas por fila. Si se prefieren 4, habría que contraer el menú o bajar la tarjeta a 160 px.
- [assumption] En la vista de lista el panel derecho conserva sus 300 px actuales.
- [assumption] El contador de la lista de sugerencias ("3 de 7") se muestra solo si hay más de 3 resultados.
- Abierta para Functional Design: cómo se sirve la imagen a la WebView (carga diferida o miniaturas) para cumplir NFR2. El diseño solo exige que la tarjeta reserve el área de 120 px y muestre el placeholder mientras carga o si falla.
