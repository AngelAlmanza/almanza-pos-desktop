# Requisitos — Módulo de Productos unificado

Fuentes: `ideation/intent-capture/intent-statement.md`, `ideation/scope-definition/scope-document.md` e `intent-backlog.md` (IDs `IB-n`), `ideation/approval-handoff/initiative-brief.md`, el análisis del código existente en `aidlc/spaces/default/codekb/almanza-pos-desktop/` y las respuestas de `requirements-analysis-questions.md` (citadas como "RA Q<n>").

## Análisis de la intención

- **Qué se busca:** que un dueño o un empleado con poca experiencia en computadoras gestione sus productos, su stock y sus categorías desde un solo lugar, y vea de inmediato qué le falta, sin perder nada de lo que hoy funciona (intent-statement.md).
- **Tipo de cambio:** reorganización y mejora de la interfaz de tres pantallas existentes, sin datos nuevos (scope-document.md).
- **Alcance técnico:** un módulo del frontend. Cambia también quién puede entrar: el cajero ahora puede ajustar stock (RA Q1).
- **Complejidad:** estándar. Pocas reglas de negocio nuevas; el riesgo principal es perder funciones al mover pantallas (initiative-brief.md).

## Requisitos funcionales

### FR1. Módulo unificado y navegación (IB-5)

- **FR1.1** El menú principal muestra una sola entrada "Productos", que reúne el listado, las categorías y el historial de ajustes. Las entradas "Categorías" e "Inventario" ya no aparecen (scope-definition Q3).
- **FR1.2** Si se llega a una dirección de las pantallas antiguas de Categorías o Inventario, el sistema lleva al módulo de Productos, a la sección equivalente.
- **FR1.3** Permisos por rol (RA Q1, RA Q7):

| Acción | Administrador | Cajero |
|--------|---------------|--------|
| Ver el listado, el stock y su estado | Sí | Sí |
| Ajustar stock de un producto activo | Sí | Sí |
| Crear, editar, activar o desactivar, eliminar productos | Sí | No |
| Crear, editar, eliminar categorías | Sí | No |
| Ver el historial de ajustes (general y por producto) | Sí | No |
| Ver el resumen y usar los filtros (FR8, FR9) | Sí | Sí |

- **FR1.4** A un cajero no se le muestran las acciones que no tiene permitidas; no se le muestran deshabilitadas.

Criterios de aceptación:
- Dado un administrador, cuando abre el menú, entonces ve "Productos" y no ve "Categorías" ni "Inventario".
- Dado un cajero, cuando abre el menú, entonces ve "Productos"; al entrar ve el listado y la acción "Ajustar stock", y no ve botones para crear, editar o eliminar, ni las secciones de categorías e historial.
- Dado cualquier usuario, cuando abre la dirección antigua de Inventario, entonces llega al módulo de Productos.

### FR2. Listado unificado con estado de stock (IB-1)

- **FR2.1** El listado muestra por producto: imagen (o la imagen de reemplazo), nombre, código de barras, categoría (o "Sin categoría"), unidad con la marca "A granel" cuando aplica, precio, stock con su unidad, stock mínimo, estado de stock, y si está activo (paridad P1).
- **FR2.2** El estado de stock de un producto activo se calcula así (RA Q2):

| Estado | Condición |
|--------|-----------|
| Agotado | stock ≤ 0 |
| Bajo | 0 < stock ≤ stock mínimo |
| Normal | stock > stock mínimo |

  Con stock mínimo 0, un producto con stock mayor que 0 es "Normal" y uno con stock 0 es "Agotado". El stock de productos a granel se compara con sus 3 decimales.
- **FR2.3** Cada estado se muestra con texto ("Agotado", "Bajo", "Normal") además del color, nunca solo con color.
- **FR2.4** Los productos inactivos están ocultos por defecto. Una opción "Mostrar inactivos" los muestra marcados como "Inactivo" y sin estado de stock (RA Q3).
- **FR2.5** El listado se ordena por nombre, sin distinguir mayúsculas ni acentos; si dos nombres coinciden, decide el orden de alta.
- **FR2.6** Cargando, vacío y error son tres vistas distintas. Sin productos, el listado lo dice ("Aún no hay productos") y el administrador ve el botón para crear uno; si la carga falla, se muestra el error y una forma de reintentar. No se agregan textos de ayuda por campo ni mensajes guía (scope-definition Q8).

Criterios de aceptación:
- Dado un producto activo con stock 3 y mínimo 5, cuando se ve el listado, entonces aparece como "Bajo".
- Dado un producto activo con stock 5 y mínimo 5, entonces aparece como "Bajo"; con stock 5,001 kg y mínimo 5 kg, como "Normal".
- Dado un producto activo con stock 0, entonces aparece como "Agotado".
- Dado un producto inactivo con stock 0, cuando "Mostrar inactivos" está apagado, entonces no aparece; cuando está encendido, aparece como "Inactivo" sin estado de stock.
- Dado que la carga de productos falla, entonces se ve un mensaje de error distinto del de "Aún no hay productos".

### FR3. Alta y edición de productos (IB-6, paridad P2–P4)

- **FR3.1** El administrador crea y edita productos con los mismos campos y las mismas validaciones de hoy: nombre, descripción, código de barras (único), precio, unidad, "A granel" (solo kg, litro o metro), categoría, stock mínimo e imagen opcional y removible. El stock inicial se captura solo al crear.
- **FR3.2** Desde el formulario del producto se puede crear una categoría nueva sin salir de él, como hoy.
- **FR3.3** Si un dato no es válido, el mensaje dice qué campo y cómo corregirlo, y se conserva todo lo que el usuario escribió.
- **FR3.4** Pulsar dos veces "Guardar" no crea dos productos.

Criterios de aceptación:
- Dado un administrador, cuando crea un producto con nombre, precio, categoría y stock inicial 10, entonces aparece en el listado con stock 10 y su estado calculado.
- Dado un código de barras que ya existe, cuando se intenta guardar, entonces se avisa que el código está repetido y el formulario conserva lo escrito.

### FR4. Activar, desactivar y eliminar productos (IB-6, paridad P5–P6)

- **FR4.1** El administrador activa o desactiva un producto desde el listado, como hoy.
- **FR4.2** El administrador elimina un producto tras confirmarlo. Si tiene ventas o ajustes, el sistema lo impide, como hoy, y el mensaje explica por qué y sugiere desactivarlo.

Criterios de aceptación:
- Dado un producto con ventas registradas, cuando el administrador intenta eliminarlo, entonces no se elimina y el mensaje sugiere desactivarlo.

### FR5. Ajuste de stock desde el producto (IB-2)

- **FR5.1** Cada producto activo del listado tiene la acción "Ajustar stock", disponible para administrador y cajero, sin salir del módulo (scope-definition Q1, RA Q1).
- **FR5.2** Los tres tipos de ajuste actuales se conservan con nombres simples (RA Q4):

| Nombre en pantalla | Tipo actual |
|--------------------|-------------|
| Llegó mercancía | Agregar stock (compra / reabastecimiento) |
| Sobró al contar | Ajuste positivo (conteo físico mayor) |
| Faltó al contar | Ajuste negativo (conteo físico menor) |

- **FR5.3** El ajuste pide tipo, cantidad (mayor que 0) y motivo opcional, y aplica las mismas validaciones de cantidad que hoy. Los productos a granel aceptan hasta 3 decimales.
- **FR5.4** Antes de confirmar, el ajuste muestra el stock actual y el que quedará.
- **FR5.5** Al confirmar, el ajuste queda registrado con su usuario, como hoy, y el listado muestra el nuevo stock y estado sin recargar la pantalla.
- **FR5.6** Los productos inactivos no se pueden ajustar, como hoy.
- **FR5.7** Pulsar dos veces "Confirmar" no registra dos ajustes.

Criterios de aceptación:
- Dado un cajero y un producto activo con stock 2 y mínimo 5, cuando registra "Llegó mercancía" con cantidad 10, entonces el ajuste muestra "quedará: 12" antes de confirmar, y después el producto aparece con stock 12 y estado "Normal".
- Dado un ajuste con cantidad 0 o vacía, cuando se intenta confirmar, entonces se avisa que la cantidad debe ser mayor que 0.
- Dado un producto a granel con stock 1,250 kg, cuando se registra "Faltó al contar" de 0,250 kg, entonces el stock queda en 1,000 kg.

### FR6. Categorías dentro del módulo (IB-3, paridad P7)

- **FR6.1** El administrador ve, crea, edita y elimina categorías dentro del módulo, con nombre único y descripción opcional, como hoy.
- **FR6.2** Al eliminar una categoría, la confirmación dice cuántos productos quedarán sin categoría. Al confirmar, esos productos aparecen como "Sin categoría" (RA Q5).

Criterios de aceptación:
- Dada una categoría con 3 productos, cuando el administrador pide eliminarla, entonces la confirmación dice que 3 productos quedarán sin categoría; al confirmar, los 3 aparecen como "Sin categoría".
- Dado un nombre de categoría que ya existe, cuando se intenta guardar, entonces se avisa que el nombre está repetido.

### FR7. Historial de ajustes dentro del módulo (IB-4, paridad P8–P9)

- **FR7.1** El administrador consulta el historial general por rango de fechas y con paginación, como hoy, con fecha, producto, tipo, cantidad, stock anterior, stock nuevo, motivo y usuario.
- **FR7.2** El administrador consulta el historial de un producto concreto desde ese producto.
- **FR7.3** El historial muestra los tipos con los nombres simples de FR5.2, también en los ajustes registrados antes del cambio.
- **FR7.4** Un rango sin ajustes se muestra como "Sin ajustes en estas fechas", distinto de un error al cargar.

Criterios de aceptación:
- Dado un ajuste "Ajuste negativo" registrado antes del cambio, cuando se ve el historial, entonces aparece como "Faltó al contar".
- Dado un producto con 2 ajustes, cuando el administrador abre su historial, entonces ve solo esos 2.

### FR8. Resumen de stock (IB-7, Should)

- **FR8.1** Arriba del listado se muestran tres cifras: productos activos, productos con stock bajo y productos agotados, con los mismos criterios de FR2.2. Los inactivos no cuentan.
- **FR8.2** Las cifras coinciden siempre con lo que el listado marca y se actualizan después de cada ajuste.

Criterios de aceptación:
- Dados 10 productos activos (2 bajos, 1 agotado) y 3 inactivos, entonces el resumen muestra 10, 2 y 1.

### FR9. Filtros (IB-8, Should)

- **FR9.1** El listado se filtra por categoría, incluida "Sin categoría", y por estado de stock (Normal, Bajo, Agotado). Los filtros se combinan entre sí y con "Mostrar inactivos".
- **FR9.2** Si un filtro no da resultados, el listado lo dice y ofrece quitar los filtros; ese mensaje es distinto del de "Aún no hay productos".

Criterios de aceptación:
- Dado el filtro "Bajo" y la categoría "Lácteos", entonces solo aparecen productos activos de Lácteos con estado "Bajo".

### FR10. Ficha de producto (IB-9, Could)

- **FR10.1** Desde el listado se abre una ficha que reúne los datos del producto, su stock y estado, y (para el administrador) su historial de ajustes (FR7.2).

## Lista de funciones actuales que no se deben perder (paridad)

Pedida en Aprobación y Entrega (approval-handoff Q3). Se revisa a mano antes de entregar (initiative-brief.md).

| ID | Función actual | Pantalla de hoy | Cubierta por |
|----|----------------|-----------------|--------------|
| P1 | Listado de productos con imagen, nombre, código, categoría, unidad y granel, precio, stock, activo | Productos | FR2.1 |
| P2 | Crear producto con todos sus campos, stock inicial e imagen | Productos | FR3.1 |
| P3 | Editar producto | Productos | FR3.1 |
| P4 | Crear una categoría desde el formulario del producto | Productos | FR3.2 |
| P5 | Activar y desactivar un producto | Productos | FR4.1 |
| P6 | Eliminar un producto, bloqueado si tiene ventas o ajustes | Productos | FR4.2 |
| P7 | Listar, crear, editar y eliminar categorías | Categorías | FR6.1 |
| P8 | Registrar un ajuste de inventario con tipo, cantidad y motivo | Inventario | FR5 |
| P9 | Historial de ajustes por rango de fechas, con paginación y usuario | Inventario | FR7.1 |
| P10 | Aviso de productos activos con stock bajo | Inventario | FR2.2, FR2.3, FR8 |
| P11 | Tabla de stock actual con stock mínimo y estado | Inventario | FR2.1 |

## Requisitos no funcionales

- **NFR1 — Rendimiento:** con hasta 500 productos (RA Q6), el listado aparece en menos de 1 segundo desde que se abre el módulo. Aplicar un filtro, mostrar inactivos o actualizar tras un ajuste tarda menos de 300 ms. Con ese volumen no hace falta paginar el listado.
- **NFR2 — Facilidad de uso:** un usuario nuevo da de alta un producto con categoría y stock inicial, sin ayuda, en menos de 2 minutos. Se mide con cronómetro desde que abre el módulo hasta que guarda; lo hace el responsable simulando a un usuario nuevo (intent-statement.md, scope-definition Q7). Alta, ajuste de stock y revisar faltantes se completan sin salir del módulo (scope-definition Q6).
- **NFR3 — Accesibilidad:** todas las acciones del módulo se pueden hacer con teclado, y ningún estado se comunica solo con color (FR2.3).
- **NFR4 — Integridad de datos:** el stock se redondea a 3 decimales y los montos a 2, con las reglas de redondeo del proyecto. Cada ajuste actualiza el stock y su registro en el historial juntos o no actualiza ninguno, como hoy.
- **NFR5 — Seguridad:** las reglas de FR1.3 se aplican en la interfaz. Hoy los permisos solo se revisan en la interfaz y el núcleo no comprueba el rol (riesgo ya aceptado en el proyecto, `architecture.md`); este cambio no lo empeora, pero amplía al cajero el ajuste de stock.
- **NFR6 — Compatibilidad:** la pantalla de venta y los reportes siguen funcionando sin cambios. Las pruebas existentes siguen pasando y se agregan pruebas puntuales para el cálculo del estado de stock (FR2.2), los permisos por rol (FR1.3) y los nombres de ajuste (FR5.2, FR7.3).
- **NFR7 — Idioma:** todos los textos están en español y con términos de uso diario.

## Restricciones

- No se agregan datos nuevos al sistema; se reorganiza y se muestra mejor lo que ya existe (intent-statement.md; regla del proyecto).
- No se cambia la pantalla de venta (POS) ni los reportes (intent-statement.md).
- Se mantienen la tecnología y los patrones actuales del proyecto (`code-structure.md`).
- Lo construye una sola persona, con ayuda de IA, sin fecha límite (initiative-brief.md).

## Supuestos

- Si hoy un ajuste "Faltó al contar" puede dejar el stock negativo o lo impide, esa regla se conserva tal cual. Razón: no cambiar reglas de negocio existentes; FR2.2 ya muestra el stock negativo como "Agotado".
- La meta de rendimiento (NFR1) supone una computadora de mostrador común y la base de datos local actual. Razón: el sistema funciona sin servidor.

## Fuera del alcance

- Textos de ayuda por campo y mensajes guía para usuarios nuevos (scope-definition Q8).
- Cambios en la pantalla de venta, en los reportes y datos nuevos (intent-statement.md).
- Búsqueda por texto dentro del listado: hoy no existe en Productos y no se pidió.
- Agregar comprobación de roles en el núcleo del sistema (NFR5).

## Preguntas abiertas

- None.
