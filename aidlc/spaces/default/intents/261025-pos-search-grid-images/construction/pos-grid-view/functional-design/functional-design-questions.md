# Preguntas de diseño funcional — U3 pos-grid-view

Casi todo lo de esta unidad ya quedó decidido en los requisitos (FR2, FR3), en la especificación de interacción y en la unidad U1 (contrato de imagen) y U2 (regla de coincidencia). Quedan tres decisiones que cambian lo que ve y hace el cajero y que la revisión de los mockups dejó abiertas. Responde con la letra o con tus palabras después de `[Answer]:`.

---

## Pregunta 1 — Dónde queda el foco después de tocar una tarjeta
Un lector de código de barras escribe dígitos y presiona Enter. Si el foco se queda en una tarjeta después de un clic, ese Enter vuelve a activar la tarjeta (agrega el mismo producto otra vez) y los dígitos no llegan a la barra. Eso rompe FR2.12 y NFR3 (escanear sigue agregando en un solo paso en la cuadrícula).

A. **El foco vuelve a la barra de búsqueda después de cada alta**, igual que en la vista de lista. El escaneo siempre funciona. Para agregar el mismo producto varias veces hay que volver a tocar la tarjeta con el ratón; con el teclado hay que volver a recorrer con Tab
B. **El foco se queda en la tarjeta** para poder agregar varias seguidas con Enter o Espacio, y los caracteres que se escriben mientras una tarjeta tiene el foco se redirigen a la barra. Es más cómodo con teclado, pero la redirección es más compleja de construir y de probar, y un Enter de escáner sobre una tarjeta sigue siendo ambiguo
X. Other (please specify)

[Answer]: A

## Pregunta 2 — Precio base en el carrito compacto
La tabla actual del carrito tiene las columnas "Compró", "Precio base" y "Total". El carrito compacto de la columna derecha (360 px) tiene filas de dos líneas. FR2.2 pide que el carrito siga funcionando "igual que hoy", y en productos a granel el precio por unidad base es información útil para el cajero.

A. **Mostrar el precio base en la segunda línea de cada fila**, junto a la cantidad (por ejemplo "2 pza × $54.00" o "0.350 kg × $120.00/kg") y el total de la partida a la derecha. El cajero conserva toda la información de hoy
B. **Omitirlo y mostrar solo cantidad y total de la partida.** Filas más limpias; el precio base se consulta en la vista de lista

X. Other (please specify)

[Answer]: A

## Pregunta 3 — Tocar una tarjeta agotada
FR2.9 pide que una tarjeta agotada se vea atenuada, con la etiqueta "Agotado", y que no modifique la venta. Una sugerencia agotada de la barra (U2) sí muestra el aviso "Stock insuficiente. Disponible: 0". Si la tarjeta no responde, el cajero no sabe si falló el toque.

A. **Mostrar el mismo aviso** "Stock insuficiente. Disponible: 0" al tocar una tarjeta agotada, igual que en las sugerencias. La venta no cambia
B. **Sin respuesta** al tocarla; solo se ve atenuada y con la etiqueta "Agotado"

X. Other (please specify)

[Answer]: A

## Assumptions & Open Questions

- [assumption] Sin caja abierta, el POS ya muestra "No hay una caja abierta" y no monta la barra ni la cuadrícula; U3 no agrega un estado nuevo (R-04a de Refined Mockups).
- [assumption] Si la recarga de productos falla después de una venta, la cuadrícula conserva las tarjetas que ya tenía y muestra un aviso discreto con "Reintentar" (R-04b). Mientras recarga no se oculta nada.
- [assumption] El texto de la barra se conserva al cambiar de vista; la cuadrícula lo aplica como filtro y la lista de sugerencias no se reabre hasta que cambie el texto (R-07).
- [assumption] La preferencia de vista se guarda en el almacenamiento local del navegador con la clave `pos_view_mode` y el valor `{ userId, viewMode }`, y `AuthContext.logout` la borra junto con `pos_session`. Un valor ausente, de otro usuario o inválido produce la vista de lista sin error (FR3).
- [assumption] Las imágenes se muestran con el contrato `productImageSource` de U1, con carga diferida por tarjeta y el área de 120 px reservada; mientras cargan o si fallan se ve el placeholder.
- [assumption] La regla de coincidencia vive una sola vez en el backend (U2). Sin texto, la cuadrícula carga `get_active_products`; con texto, llama a `suggest_products` sin límite desde el primer carácter y con un retardo de 100 ms, con número de secuencia para descartar respuestas viejas. El agrupado y el orden se hacen en la pantalla. No se duplica la regla en TypeScript.
