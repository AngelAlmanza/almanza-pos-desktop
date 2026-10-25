# Especificación de interacción — POS (sugerencias, cuadrícula) e imagen de producto

Cada componente sigue la plantilla de `.claude/knowledge/aidlc-design-agent/component-spec-template.md`. Los nombres de componentes son propuestas para Functional Design y Code Generation; los IDs de requisito vienen de `requirements.md`. La aplicación es de escritorio (Tauri), así que el ancho mínimo útil de la ventana es de unos 1024 px. Las columnas "móvil" y "tableta" describen ventanas angostas, no dispositivos.

---

## PosSearchBar (modificado)

| Field | Value |
|---|---|
| Component | PosSearchBar |
| Description | Barra de escaneo y búsqueda del POS. Conserva el envío con Enter y agrega las sugerencias (solo en vista de lista) y el selector de vista |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Campo vacío con foco, placeholder actual | carga del POS o cambio en el carrito |
| typing-short | Texto de menos de 3 caracteres; sin lista | escribir en el campo |
| suggesting | Lista de sugerencias abierta (solo en vista de lista) | texto de 3 o más caracteres, 200 ms sin teclear y resultados recibidos |
| loading | Búsqueda de sugerencias en curso; se mantienen los resultados anteriores, con barra de progreso de 2 px bajo el campo | consulta en vuelo |
| empty | Lista abierta con "Sin coincidencias" | texto de 3 o más caracteres sin resultados |
| error | La consulta de sugerencias falló; la lista se cierra y se muestra el `Alert` de error del POS con el mensaje; Enter sigue funcionando | error del servicio |
| submitting | Flujo de Enter en curso, como hoy | Enter |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| viewMode | 'list' \| 'grid' | yes | — | Vista activa; en `grid` no se abre la lista de sugerencias |
| onViewModeChange | (mode) => void | yes | — | Cambia la vista y guarda la preferencia (ver "Preferencia de vista") |
| onTermChange | (term: string) => void | yes | — | Publica el texto actual para que la cuadrícula filtre (FR2.6) |

### Comportamiento

1. **Disparo de sugerencias** (FR1.1, NFR1): se buscan con `trim(texto).length >= 3`, después de 200 ms sin teclear. Cada consulta lleva un número de secuencia y solo se aplica la respuesta de la más reciente (FR1.11).
2. **Coincidencia** (FR1.2): nombre o código contiene el texto, sin distinguir mayúsculas ni acentos, solo productos activos y como máximo 10 resultados. El orden es: primero los que empiezan con el texto, luego el resto, cada bloque por nombre ascendente. Así lo más probable queda en las 3 filas visibles. Es una decisión de presentación que no cambia el conjunto de resultados.
3. **Teclado** (FR1.5, FR1.6):

| Tecla | Lista cerrada | Lista abierta sin resaltado | Lista abierta con resaltado |
|---|---|---|---|
| ↓ | — | Resalta la 1.ª fila | Resalta la siguiente (se detiene en la última) |
| ↑ | — | — | Resalta la anterior; en la 1.ª quita el resaltado |
| Enter | Flujo actual (código exacto → coincidencias → agregar, modal o error) | Flujo actual | Agrega la sugerencia resaltada |
| Esc | — | Cierra la lista y conserva el texto | Cierra la lista y conserva el texto |
| Tab | Foco al siguiente control | Cierra la lista y pasa el foco | Cierra la lista y pasa el foco |

   Cualquier cambio de texto quita el resaltado, de modo que un escaneo (texto rápido seguido de Enter) siempre usa el flujo actual (NFR3). El resaltado desplaza la lista para mantener visible la fila resaltada.
4. **Selección** (FR1.7): con clic o Enter sobre una fila se aplica el mismo `handleProductSelected` de hoy. Un producto a granel abre `BulkQuantityDialog` y uno por pieza se agrega con cantidad 1, con la validación de stock actual. Al terminar se limpia el campo, se cierra la lista y el foco vuelve al campo.
5. **Producto agotado** (FR1.8): se puede resaltar, pero al elegirlo se muestra "Stock insuficiente. Disponible: 0" (mensaje actual) y la venta no cambia.
6. **Cierre** (FR1.10): la lista se cierra cuando el texto baja de 3 caracteres, al hacer clic fuera, cuando el campo pierde el foco (después de procesar un clic en una fila), al agregar un producto o al cambiar a la vista de cuadrícula.
7. **Vista de cuadrícula** (P2 = A): el campo no abre la lista. Cada cambio de texto se publica de inmediato con `onTermChange` y Enter conserva el flujo actual.

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | No aplica (escritorio). Si la ventana es muy angosta, el selector de vista se queda a la derecha y el campo se encoge |
| tablet (768–1024px) | La lista mide lo mismo que el campo |
| desktop (>1024px) | Diseño por defecto (M1) |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | Campo `role="combobox"` con `aria-expanded`, `aria-controls` hacia la lista, `aria-autocomplete="list"` y `aria-activedescendant` hacia la fila resaltada. La lista es `role="listbox"` y cada fila es `role="option"` con `aria-selected` y `aria-disabled` si está agotada |
| Keyboard interaction | Tabla de teclado anterior |
| Label / aria-label | `aria-label="Escanear o buscar producto por nombre o código"` |
| Contrast ratio | WCAG AA (4.5:1 texto, 3:1 resaltado y foco) |
| Screen reader | Región `aria-live="polite"` que anuncia "N sugerencias" o "Sin coincidencias" al actualizar |
| Focus management | El foco nunca sale del campo mientras se navega la lista; después de agregar vuelve al campo, igual que hoy |

---

## ViewModeToggle (nuevo)

| Field | Value |
|---|---|
| Component | ViewModeToggle |
| Description | Selector exclusivo Lista / Cuadrícula dentro de la tarjeta de la barra de búsqueda |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | Una opción seleccionada (fondo `rgba(13,107,95,0.10)` e icono `primary`) | carga |
| hover | Fondo `rgba(13,107,95,0.04)` | mouseover |
| focus | Contorno de 2 px `primary.main` | Tab |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| value | 'list' \| 'grid' | yes | — | Vista activa |
| onChange | (mode) => void | yes | — | Ignora `null` (no se puede deseleccionar) |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `ToggleButtonGroup` exclusivo (`role="group"`, `aria-label="Vista de productos"`); cada botón con `aria-pressed` |
| Keyboard interaction | Tab entra al grupo; Enter o Espacio activan |
| Label / aria-label | "Vista de lista" / "Vista de cuadrícula" (con tooltip y `aria-label`) |
| Contrast ratio | 3:1 para el icono y el estado seleccionado |
| Screen reader | Anuncia el botón y su estado presionado |
| Focus management | Después de cambiar de vista, el foco vuelve a la barra de búsqueda para no romper el escaneo |

### Preferencia de vista (FR3)

- **Al cambiar de vista**, se guarda `{ userId, viewMode }` en un almacenamiento del navegador ligado a la sesión de login (no en la base de datos, FR3.2).
- **Al abrir el POS**, se lee la preferencia. Si existe, pertenece al usuario actual y su valor es `'list'` o `'grid'`, se aplica. En cualquier otro caso (falta, otro usuario, valor inválido o error de lectura) se usa `'list'` sin mostrar error (FR3.3, FR3.5).
- **Al cerrar sesión** (`AuthContext.logout`), la preferencia se borra junto con la sesión (FR3.4).
- El mecanismo concreto (por ejemplo, una clave junto a `pos_session` que `logout` borre) se decide en Functional Design.

---

## ProductGrid (nuevo)

| Field | Value |
|---|---|
| Component | ProductGrid |
| Description | Cuadrícula de tarjetas de productos activos agrupadas por categoría, filtrada por el texto de la barra y ordenable |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| loading | Skeleton (M4) | primera carga o reintento |
| error | `Alert` con "Reintentar" (M4) | falla la carga |
| empty-catalog | "No hay productos activos" (M4) | 0 productos activos |
| empty-filter | "Sin coincidencias para «texto»" y "Limpiar búsqueda" (M4) | filtro sin resultados |
| populated | Grupos con tarjetas (M2) | datos disponibles |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| term | string | yes | '' | Texto de la barra; se filtra desde el 1.er carácter (FR2.6) |
| onProductSelect | (product) => void | yes | — | Mismo flujo de agregado que la barra (FR2.8) |
| onClearSearch | () => void | yes | — | Limpia la barra desde el estado vacío |

### Comportamiento

1. **Datos**: se cargan los productos activos al entrar a la vista de cuadrícula. Se recargan después de cada venta cobrada (FR2.11) y al volver al POS.
2. **Filtro**: es la misma regla de normalización que las sugerencias (contiene, sin mayúsculas ni acentos), con un retardo de 100 ms sobre el texto.
3. **Agrupado** (FR2.4): los grupos se ordenan alfabéticamente con la misma normalización y "Sin categoría" va al final. Cada encabezado muestra el número de productos visibles del grupo.
4. **Orden** (FR2.5): el criterio y la dirección se aplican dentro de cada grupo; los empates se resuelven por nombre ascendente. Por defecto, nombre ascendente.
5. **Scroll**: el contenedor tiene scroll propio y los encabezados son sticky. Al cambiar el filtro, el scroll vuelve arriba.
6. **Carga de imágenes**: cada tarjeta carga su imagen solo cuando entra en pantalla (carga diferida) y reserva el área de 120 px, así que el diseño no salta. El mecanismo técnico se decide en Functional Design (NFR2).

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | No aplica (escritorio) |
| tablet (768–1024px) | Menú lateral temporal; unas 4 tarjetas por fila |
| desktop (>1024px) | `auto-fill, minmax(176px, 1fr)`: 3 por fila a 1366 px y 6 a 1920 px |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | Cada grupo es un `section` con `aria-labelledby` hacia su encabezado (`h2` visual de caption); las tarjetas van en una lista (`ul` / `li`) |
| Keyboard interaction | Tab recorre las tarjetas en orden de lectura; Enter o Espacio agregan; Inicio y Fin del scroll con el teclado nativo |
| Label / aria-label | Contenedor `aria-label="Productos"` |
| Contrast ratio | Texto 4.5:1; borde de foco 3:1 |
| Screen reader | `aria-live="polite"` anuncia "N productos" al cambiar el filtro |
| Focus management | El foco inicial queda en la barra de búsqueda. Después de agregar desde una tarjeta, el foco **se queda en la tarjeta** para poder agregar varias seguidas; Esc lleva el foco a la barra |

---

## ProductCard (nuevo)

| Field | Value |
|---|---|
| Component | ProductCard |
| Description | Tarjeta de un producto con imagen o placeholder, nombre, código, precio y stock |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | M3 "Normal" | render |
| hover | Borde `primary.main` y fondo teal al 4 % | mouseover |
| focus | Contorno de 2 px con offset de 2 px | Tab |
| pressed | Fondo teal al 8 % durante 120 ms | clic o Enter |
| disabled | Agotado: opacidad 0.55, chip "Agotado", sin acción (FR2.9) | `stock <= 0` |
| loading | Área de imagen con skeleton hasta que carga | imagen pendiente |
| error | Imagen ilegible: placeholder (FR4.12) | `onError` de la imagen |
| empty | Sin imagen: placeholder | `image` nulo |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| product | Product | yes | — | Incluye la referencia de imagen opcional |
| onSelect | (product) => void | yes | — | Agregar a la venta |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `button` nativo (`ButtonBase`) que envuelve el contenido |
| Keyboard interaction | Enter o Espacio activan; agotada: `aria-disabled="true"` y la activación no hace nada |
| Label / aria-label | "Jamón de pavo FUD 250 g, $54.00, stock 12 pza" o "…, agotado" |
| Contrast ratio | Texto de precio `primary` sobre blanco ≥ 4.5:1 |
| Screen reader | Imagen con `alt=""` (decorativa, porque el nombre ya está en la etiqueta) |
| Focus management | Ver ProductGrid |

---

## CompactCart (nuevo, solo en vista de cuadrícula)

| Field | Value |
|---|---|
| Component | CompactCart |
| Description | Presentación compacta del mismo carrito (`PosProvider`) en la columna derecha de 360 px |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| empty | "Toca un producto para agregarlo" | carrito vacío |
| populated | Filas de 2 líneas con scroll propio | partidas en el carrito |
| highlight | Partida recién agregada o cambiada con fondo teal al 8 % durante 600 ms | `ADD_ITEM` / `INCREMENT` |

### Comportamiento

Usa las mismas acciones del reductor que `SaleSummaryTable`:
- −/+ (`INCREMENT`) para productos por pieza; − en cantidad 1 elimina, igual que hoy;
- "Editar" para productos a granel, que abre `BulkQuantityDialog` (`SET_INPUT`);
- eliminar (`REMOVE_ITEM`).

Las validaciones de stock y los mensajes de error son los de hoy.

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | Lista (`ul`) con encabezado "Venta actual" |
| Keyboard interaction | Botones nativos −, +, Editar y eliminar, alcanzables con Tab |
| Label / aria-label | "Disminuir cantidad de <producto>", "Aumentar…", "Eliminar <producto>" |
| Screen reader | Los cambios del total ya se reflejan en el panel de resumen |
| Focus management | Al eliminar una partida, el foco pasa a la siguiente fila o, si no hay, a la barra de búsqueda |

---

## ProductImageField (nuevo; sustituye el uso directo de ImageField en productos)

| Field | Value |
|---|---|
| Component | ProductImageField |
| Description | Columna de imagen del diálogo de producto: vista previa de 160×160, elegir o cambiar, quitar, ayuda y error |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| empty | Placeholder "Sin imagen" y "Elegir imagen" | producto sin imagen |
| saved | Imagen guardada, "Cambiar imagen" y "Quitar imagen" | producto con imagen |
| pending-new | Nueva imagen elegida sin guardar; caption "Se aplicará al guardar" | archivo válido elegido |
| pending-remove | Placeholder, "Se quitará al guardar" y "Deshacer" | Quitar en un producto con imagen guardada |
| error | Mensaje bajo los botones y vista previa sin cambios | archivo inválido (FR4.4) |
| missing | Placeholder con "No se encontró la imagen guardada" | la copia guardada no existe |
| disabled | Botones deshabilitados | guardando |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| currentImage | referencia \| null | yes | — | Imagen guardada del producto |
| value | cambio pendiente: ninguno, nueva ruta de origen o quitar | yes | ninguno | Lo que se aplicará al guardar |
| onChange | (cambio) => void | yes | — | Actualiza el cambio pendiente |
| disabled | boolean | no | false | Mientras se guarda |

### Comportamiento

1. **"Elegir/Cambiar imagen"** abre el selector nativo con el filtro png, jpg, jpeg y webp (FR4.2). Si el usuario cancela el selector, nada cambia.
2. **Validación al elegir**: extensión, tamaño de 5 MB o menos y contenido decodificable de un formato permitido. Si falla, se muestra el error con su motivo y el cambio pendiente sigue igual (FR4.4). La validación se repite en el backend al guardar.
3. **Vista previa** de la imagen nueva antes de guardar. No se copia nada hasta Guardar (FR4.6, FR4.7).
4. **"Quitar imagen"** pasa a pending-remove; "Deshacer" regresa al estado anterior (FR4.8).
5. **"Cancelar"** del diálogo descarta el cambio pendiente sin efectos (FR4.7).

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | No aplica |
| tablet (768–1024px) / diálogo < 900 px | Fila horizontal arriba de los campos: recuadro de 96 px y botones al lado |
| desktop (>1024px) | Columna derecha de 200 px con recuadro de 160 px (M5) |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | Grupo con `aria-labelledby` hacia "Imagen (opcional)" |
| Keyboard interaction | Botones nativos; el selector de archivos es el diálogo nativo del sistema |
| Label / aria-label | Vista previa con `alt="Imagen de <nombre del producto>"` o "Sin imagen" |
| Contrast ratio | Texto de error `error.main` ≥ 4.5:1 sobre blanco, con icono |
| Screen reader | El error y los avisos de cambio pendiente van en `aria-live="polite"` |
| Focus management | Después de elegir, el foco vuelve a "Cambiar imagen"; después de quitar, a "Deshacer" |

---

## Flujos

```text
Flow: Agregar con sugerencia
Persona: Cajero
Trigger: escribe 3 o más letras en vista de lista
Steps:
  1. POS lista -> escribe "jamo" -> lista con hasta 10 sugerencias (3 visibles)
  2. Lista -> ↓ y Enter (o clic) -> se agrega; si es a granel, diálogo de granel -> confirma
  3. Carrito actualizado -> foco en la barra vacía
Success outcome: partida nueva en el carrito
Error paths:
  - agotado -> "Stock insuficiente. Disponible: 0" -> elige otro
  - sin coincidencias -> "Sin coincidencias" -> corrige el texto o usa Enter
  - falla la consulta -> Alert de error -> Enter sigue disponible
```

```text
Flow: Vender desde la cuadrícula
Persona: Cajero
Trigger: elige "Vista de cuadrícula"
Steps:
  1. POS cuadrícula -> escribe "ali" -> tarjetas filtradas por grupo
  2. Tarjeta -> clic, Enter o Espacio -> partida en "Venta actual"; a granel abre su diálogo
  3. Venta actual -> Cobrar -> diálogo de cobro actual -> la cuadrícula recarga el stock
Success outcome: venta cobrada y stock actualizado en las tarjetas
Error paths:
  - tarjeta agotada -> sin acción
  - error al cargar -> Reintentar
```

```text
Flow: Asignar imagen a un producto
Persona: Administrador
Trigger: Nuevo o Editar en Catálogo > Productos
Steps:
  1. Diálogo -> "Elegir imagen" -> selector nativo -> archivo png/jpg/webp de 5 MB o menos
  2. Vista previa -> "Se aplicará al guardar" -> Guardar
  3. Se guarda la copia en la carpeta de la app -> se cierra el diálogo -> la tarjeta del POS muestra la imagen
Success outcome: producto con imagen
Error paths:
  - formato, tamaño o archivo dañado -> mensaje bajo los botones -> elegir otro
  - falla el guardado -> Alert en el diálogo; el producto conserva su imagen anterior (FR4.9)
```

## Sources

- Initial description: la descripción original del usuario (`project-description.json`).
- `requirements.md` FR1–FR4, NFR1–NFR3, NFR6.
- `refined-mockups-questions.md` Q1–Q5.
- Código actual: `PosSearchBar.tsx` (flujo de Enter, `handleProductSelected`, `addToCart`), `SaleSummaryTable.tsx` (acciones del carrito), `PosProvider.tsx` (acciones `ADD_ITEM`, `INCREMENT`, `SET_INPUT`, `REMOVE_ITEM`), `AuthContext` (`pos_session`).

## Assumptions & Open Questions

- [assumption] Retardo de 200 ms para las sugerencias y de 100 ms para el filtro de la cuadrícula. Así se cumple NFR1 (300 ms o menos desde la última tecla). Es la definición del retardo que pidió la revisión de requisitos (R-04).
- [assumption] Las sugerencias se ordenan con "empieza con" primero; el conjunto sigue siendo "contiene" (Q1 de requisitos).
- [assumption] En la cuadrícula el foco se queda en la tarjeta después de agregar, para poder agregar varias seguidas; Esc vuelve a la barra.
- [assumption] "Agotado" significa `stock <= 0`, lo que cubre el stock negativo (R-05). Un producto con stock positivo pero menor que la cantidad pedida se trata con la validación actual del reductor, que muestra "Stock insuficiente".
- Abierta para Functional Design: cómo se sirven y cargan las imágenes (NFR2) y el mecanismo para guardar la preferencia de vista ligada a la sesión.
