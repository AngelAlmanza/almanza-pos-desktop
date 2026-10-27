# Preguntas de diseño funcional — U2 search-suggestions

Casi todo lo de esta unidad ya quedó decidido en los requisitos (FR1), en la especificación de interacción de los mockups y en la división del trabajo: 3 caracteres, hasta 10 resultados con 3 visibles, teclado, retardo de 200 ms, estados de carga, vacío y error, y Enter sin cambios. Quedan dos decisiones técnicas que cambian cómo se comporta la lista frente al cajero y qué recibe U3 como regla compartida. Responde con la letra o con tus palabras después de `[Answer]:`.

---

## Pregunta 1 — Dónde se buscan las sugerencias
Hoy la búsqueda del POS (`search_products`) consulta la base con `LIKE`, devuelve como máximo 20 productos y **no ignora los acentos** ("jamon" no encuentra "Jamón"). Los requisitos piden ignorar mayúsculas y acentos (FR1.2) y mostrar la lista en 300 ms o menos con hasta 5 000 productos (NFR1). U3 usará la misma regla para filtrar la cuadrícula.

A. **En la pantalla, sobre la lista de productos activos ya cargada.** Al abrir el POS se cargan los productos activos una vez (el comando `get_active_products` ya existe y no se usa) y cada sugerencia se calcula en memoria con una función que quita acentos y mayúsculas. Responde al instante, no consulta la base en cada tecla y U3 reutiliza exactamente la misma función. El stock de la lista puede quedar desactualizado entre cargas (la Pregunta 2 decide cómo se refresca)
B. **En el backend, con un comando nuevo.** Cada pausa al teclear consulta la base y el backend normaliza acentos (por ejemplo, filtrando en Rust sobre los productos activos). El stock siempre viene fresco, pero cada sugerencia es un viaje a la base, el retardo de 200 ms se vuelve parte del presupuesto de 300 ms y U3 tendría que usar otro camino o repetir la regla en TypeScript
X. Other (please specify)

[Answer]: B

## Pregunta 2 — Qué tan fresco debe estar el stock al elegir una sugerencia
Solo aplica si eliges A en la Pregunta 1. El cajero elige una sugerencia y el sistema valida el stock con el dato de la lista cargada. Otra caja o una venta anterior pueden haber cambiado el stock desde que se cargó.

A. **Recargar la lista después de cada venta cobrada y cada vez que se vuelve al POS**, y confiar en ella al elegir. Es lo más simple; en una caja única el stock solo cambia por las ventas de esa misma caja o por ajustes de inventario hechos en otra pantalla, y en ambos casos se vuelve a pasar por el POS
B. **Igual que A, y además leer de nuevo el producto elegido antes de agregarlo** para validar con el stock real del momento. Agrega una consulta por cada selección (rápida, por id), pero evita agregar con un stock viejo
X. Other (please specify)

[Answer]: B

## Assumptions & Open Questions

- [assumption] Si la Pregunta 1 es B, la Pregunta 2 no aplica y se anota como no aplicable.
- [assumption] La regla de coincidencia se publica como una función pura reutilizable por U3 (FR1.2); su ubicación exacta es de implementación.
