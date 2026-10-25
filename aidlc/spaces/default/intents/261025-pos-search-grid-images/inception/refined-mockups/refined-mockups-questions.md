# Preguntas de Refined Mockups — POS (sugerencias, cuadrícula) e imagen de producto

Hoy el POS tiene dos columnas. A la izquierda están los avisos, la barra de búsqueda y la tabla del carrito; a la derecha, el panel "Resumen de Venta" de 300 px con el total y el botón Cobrar. Estas preguntas definen cómo encajan las piezas nuevas sin perder ese flujo. Responde con la letra o con tus palabras después de `[Answer]:`.

---

## Pregunta 1 — Dónde va el carrito en la vista de cuadrícula
En la vista de lista, la tabla del carrito ocupa casi todo el panel izquierdo. En la vista de cuadrícula, las tarjetas necesitan ese espacio, y el carrito tiene que seguir visible (FR2.2).

A. El panel izquierdo se divide: arriba la barra de búsqueda y la cuadrícula (con su propio scroll) y abajo un carrito compacto de altura fija (unas 4 partidas visibles, con scroll)
B. La cuadrícula ocupa todo el panel izquierdo y el carrito pasa a la columna derecha, arriba del total y del botón Cobrar (la columna se ensancha a unos 360 px)
C. Tres columnas: cuadrícula, carrito y resumen de venta
X. Other (please specify)

[Answer]: B

## Pregunta 2 — Sugerencias en la vista de cuadrícula
En la vista de cuadrícula, la barra ya filtra las tarjetas desde el primer carácter (FR2.6). Si además aparece la lista de sugerencias, habría dos resultados a la vez y las flechas ↑/↓ podrían chocar con la cuadrícula. Es el punto que señaló la revisión de requisitos.

A. En la vista de cuadrícula no se muestra la lista de sugerencias: la cuadrícula filtrada hace ese papel. Enter conserva su flujo actual (escáner, coincidencias y modal)
B. Se muestran ambas: la lista de sugerencias sobre la cuadrícula filtrada
C. En la vista de cuadrícula, Enter agrega el primer producto de la cuadrícula filtrada en lugar del flujo actual
X. Other (please specify)

[Answer]: A

## Pregunta 3 — Tamaño de las tarjetas
Con la pantalla típica de la caja (1366 o 1920 px de ancho), el tamaño de la tarjeta define cuántos productos se ven sin desplazarse.

A. Compactas: unos 150 px de ancho, imagen de 96 px de alto; caben 4–5 por fila en 1366 px
B. Medianas: unos 190 px de ancho, imagen de 120 px de alto; caben 3–4 por fila en 1366 px
C. Grandes: unos 240 px de ancho, imagen de 160 px de alto; caben 2–3 por fila en 1366 px
X. Other (please specify)

[Answer]: B

## Pregunta 4 — Cómo moverse entre categorías
Las tarjetas van agrupadas por categoría con su encabezado (FR2.4). Con muchas categorías puede costar llegar a la que se busca.

A. Encabezados de categoría que se quedan fijos arriba al desplazarse (sticky), sin más controles
B. Además de los encabezados, una fila de chips con las categorías arriba de la cuadrícula: al tocar uno, la vista salta a ese grupo
C. Grupos plegables (acordeón) que se pueden contraer y expandir
X. Other (please specify)

[Answer]: A

## Pregunta 5 — Dónde va la imagen en el formulario de producto
Hoy el diálogo "Nuevo/Editar Producto" es una columna de campos (nombre, descripción, código, precio/unidad, granel, categoría, stock).

A. Arriba del todo, a la izquierda del nombre: un recuadro de 96×96 px con la vista previa (o el placeholder) y, debajo, los botones "Elegir imagen" / "Cambiar" y "Quitar"
B. Al final del formulario, como una fila "Imagen" con miniatura y botones, igual que el logotipo en Configuración
C. Un recuadro grande de 160×160 px en una columna a la derecha del formulario, que se ensancha
X. Other (please specify)

[Answer]: C
