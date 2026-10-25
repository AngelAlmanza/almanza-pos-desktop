# Preguntas de Análisis de Requisitos — Mejoras al POS (sugerencias, cuadrícula, imágenes)

Estas preguntas cierran las decisiones que la descripción inicial y el mapeo del código dejaron abiertas. Responde cada una escribiendo la letra (o tu respuesta) después de `[Answer]:`.

---

## Pregunta 1 — Cómo coincide el texto buscado
Hoy, al presionar Enter, el sistema busca productos cuyo nombre o código de barras **contiene** el texto en cualquier parte (por ejemplo, "che" encuentra "Leche"). En la descripción mencionaste filtrar "por ese prefix" en la cuadrícula. ¿Qué regla deben usar las sugerencias en vivo y el filtro de la cuadrícula?

A. Que el nombre o el código **empiece** con el texto ("ali" encuentra "Alimento para perro", pero no "Vitalimento")
B. Que **alguna palabra** del nombre empiece con el texto, o que el código empiece con él ("perro" encuentra "Alimento para perro")
C. Que el nombre o el código **contenga** el texto en cualquier parte (igual que el Enter actual)
D. Sugerencias por prefijo (A), pero la cuadrícula por contenido (C)
X. Other (please specify)

[Answer]: C

## Pregunta 2 — Mayúsculas y acentos
Hoy la búsqueda ignora mayúsculas solo en letras sin acento, así que "jamon" no encuentra "Jamón" y "ÑOÑO" no siempre encuentra "ñoño". ¿Cómo deben compararse los textos en sugerencias y cuadrícula?

A. Ignorar mayúsculas **y** acentos ("jamon" encuentra "Jamón")
B. Ignorar solo mayúsculas; los acentos deben escribirse
C. Comparación exacta
X. Other (please specify)

[Answer]: A

## Pregunta 3 — Cuándo aparecen las sugerencias y cuántas
Las sugerencias se muestran bajo la barra mientras el cajero escribe. Mostrarlas desde la primera letra puede estorbar al escanear códigos de barras; mostrar muchas puede tapar el carrito.

A. A partir de 2 caracteres, máximo 8 sugerencias
B. A partir de 1 carácter, máximo 10 sugerencias
C. A partir de 3 caracteres, máximo 5 sugerencias
X. Other (please specify)

[Answer]: X. 3 caracteres, 10 max, muestras 3 elementos el resto lo escondes con scroll

## Pregunta 4 — Qué pasa al elegir una sugerencia y cómo se usa el teclado
Se debe conservar el comportamiento actual de Enter (código exacto → coincidencias → modal). Falta definir cómo conviven las sugerencias con él.

A. Flechas ↑/↓ resaltan una sugerencia; Enter con una sugerencia resaltada la agrega a la venta; Enter sin sugerencia resaltada hace lo de hoy; clic también agrega; Esc cierra la lista. Al agregar se limpia la barra (los productos a granel abren el diálogo de cantidad como hoy)
B. Igual que A, pero al elegir una sugerencia solo se rellena la barra con el nombre y el cajero confirma con Enter
C. Solo con clic (sin navegación por teclado)
X. Other (please specify)

[Answer]: A

## Pregunta 5 — Qué significa "por sesión" para recordar la vista (lista o cuadrícula)
Pediste que la preferencia no se guarde en la base de datos y que dure "a lo largo de la sesión".

A. Mientras la aplicación esté abierta: si cierras y vuelves a abrir la app, vuelve a la vista actual (lista)
B. Mientras el usuario tenga la sesión iniciada: al cerrar sesión se olvida
C. Recordarla en esta computadora aunque se cierre la app (sin base de datos, en el almacenamiento local de la app)
X. Other (please specify)

[Answer]: B

## Pregunta 6 — Productos sin stock en la cuadrícula
El POS no permite vender más de lo que hay en existencia. En la cuadrícula, ¿cómo se muestran los productos con stock 0?

A. Se muestran atenuados con la etiqueta "Agotado" y no se pueden agregar
B. No se muestran en la cuadrícula
C. Se muestran normales; al tocarlos aparece el error de stock que ya existe
X. Other (please specify)

[Answer]: A

## Pregunta 7 — Tipos y tamaño de imagen permitidos
La imagen se elige de un archivo del equipo y se copia a la carpeta de la app. Hoy el logotipo acepta png, jpg, jpeg, webp, gif y svg sin límite de tamaño. Imágenes muy pesadas harán lenta la cuadrícula.

A. png, jpg, jpeg y webp, máximo 5 MB
B. png, jpg, jpeg, webp y gif, máximo 2 MB
C. Los mismos formatos que el logotipo, sin límite de tamaño
X. Other (please specify)

[Answer]: A

## Pregunta 8 — Qué hacer con el archivo copiado al quitar o reemplazar la imagen
Cuando el usuario quita la imagen de un producto o la cambia por otra, la copia anterior queda en la carpeta de la app. Al eliminar un producto pasa lo mismo.

A. Borrar la copia anterior de la carpeta de la app (el archivo original del usuario nunca se toca)
B. Conservar las copias anteriores (ocupan espacio, pero nada se borra)
X. Other (please specify)

[Answer]: A
