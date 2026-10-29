# Preguntas — Bocetos Refinados

Contexto: los requisitos aprobados (`inception/requirements-analysis/requirements.md`) definen qué hace el módulo. Aquí decidimos cómo se ve y cómo se usa, siguiendo el estilo actual de la app ("La Caja", `docs/interface-design/system.md`). En esta fase no hubo bocetos previos, así que se diseña directo desde los requisitos.

## Q1. ¿Cómo se organiza el módulo de Productos?

Debe reunir el listado, las categorías y el historial (FR1.1). El cajero solo ve el listado (FR1.3).

A. Pestañas arriba: "Productos", "Categorías" e "Historial de stock"; el cajero solo ve "Productos"
B. Una sola vista: el listado al centro y las categorías en una columna a la izquierda, que sirve para filtrar y para administrarlas; el historial se abre con un botón
C. El listado como vista principal; las categorías y el historial se abren en paneles laterales desde botones del encabezado
D. Not yet defined
X. Other (please specify)

[Answer]: X. Other — "Seria algo como el B, columna de categorias con el listado al centro, para ver el historial completo usariamos un tab, pero con la posibilidad de ver el historico de un producto en especifico con solo pulsar un boton, aqui haria explorar las opciones de abrir un modal, desplegar una lista, abrir un panel o buscar otras opciones que sea UI/UX friendly"

## Q2. ¿Cómo se ajusta el stock desde un producto?

FR5: el ajuste muestra el stock actual y el que quedará, sin salir del módulo.

A. Un diálogo pequeño que se abre desde el botón "Ajustar stock" de la fila
B. Un panel lateral que se abre a la derecha, con el producto, su stock actual y el ajuste
C. Editar el número de stock directamente en la celda de la tabla
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q3. ¿Cómo se elige el tipo de ajuste ("Llegó mercancía", "Sobró al contar", "Faltó al contar")?

A. Tres botones grandes con icono, uno por tipo, visibles a la vez
B. Una lista desplegable, como hoy
C. Dos botones ("Entra" y "Sale") y, al elegir "Entra", una opción para distinguir compra de conteo
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. ¿Cómo se muestran las acciones de cada producto en el listado?

Los usuarios objetivo son poco afines a la tecnología, y no habrá textos de ayuda (scope-definition Q8).

A. "Ajustar stock" como botón con texto, siempre visible; editar, activar o desactivar y eliminar como iconos con su nombre al pasar el cursor
B. Todas las acciones en un menú de tres puntos por fila
C. Todas como botones con texto visibles
D. Not yet defined
X. Other (please specify)

[Answer]: A — "Podemos usar la A y usar tooltips"

## Q5. ¿Cómo se ve el resumen de stock (total, bajos, agotados)?

FR8. La revisión de requisitos señaló que hoy el aviso de Inventario enumera los nombres de los productos con stock bajo, y el resumen solo da cifras.

A. Tres tarjetas con cifra; al pulsar "Bajo" o "Agotado" se filtra el listado y se ven esos productos
B. Tres tarjetas solo informativas, sin interacción
C. Una línea de texto arriba del listado con las tres cifras
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. ¿Qué tamaño de ventana mínimo debe soportar el módulo?

Es una aplicación de escritorio; esto decide qué columnas se ocultan en ventanas pequeñas.

A. Solo pantallas de escritorio, desde 1280 px de ancho
B. Desde 1024 px; en ventanas más pequeñas se ocultan columnas secundarias
C. Desde 768 px, con el listado convertido en tarjetas en ventanas angostas
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q7. ¿Se conservan la descripción del producto en el listado y la fecha de creación de las categorías?

La revisión de requisitos señaló que hoy el listado de Productos muestra la descripción bajo el nombre y que la tabla de Categorías muestra la fecha de creación; los requisitos no las mencionaban.

A. Se conservan ambas, como hoy
B. Solo la descripción; la fecha de creación de categorías se quita
C. Se quitan ambas para simplificar
D. Not yet defined
X. Other (please specify)

[Answer]: B
