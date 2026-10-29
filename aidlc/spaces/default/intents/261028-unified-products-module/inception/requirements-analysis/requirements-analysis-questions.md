# Preguntas — Análisis de Requisitos

Contexto: el alcance aprobado (`ideation/scope-definition/scope-document.md`) une Productos, Categorías e Inventario en un solo módulo, sin datos nuevos y sin perder funciones. Revisé cómo funcionan hoy las tres pantallas para armar la lista de funciones que no se deben perder; estas preguntas cubren lo que solo tú puedes decidir.

## Q1. ¿Quién puede entrar al nuevo módulo de Productos?

Hoy solo el administrador puede abrir Productos, Categorías e Inventario; los cajeros no los ven. En la captura de la intención dijiste que lo usan tanto dueños como empleados, así que necesito confirmar.

A. Igual que hoy: solo el administrador
B. Los cajeros también pueden ver el listado y el stock, pero no cambiar nada
C. Los cajeros también pueden ajustar stock, pero no crear, editar ni eliminar productos o categorías
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q2. ¿Cómo se distingue "stock bajo" de "agotado"?

Hoy un producto activo tiene stock bajo cuando su stock es igual o menor que su stock mínimo; no existe un estado "agotado" aparte. El alcance pide marcar ambos.

A. Agotado: stock en 0 o menos. Bajo: más de 0 y hasta el stock mínimo. Normal: por encima del mínimo
B. Solo "bajo" (igual que hoy), sin un estado agotado aparte
C. Agotado: stock en 0 o menos. Bajo: más de 0 y menor (no igual) que el stock mínimo
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. ¿Cómo aparecen los productos inactivos en el listado unificado?

Hoy la pantalla de Productos muestra todos, y las alertas de stock bajo de Inventario ignoran los inactivos.

A. Se muestran, marcados como inactivos y sin alerta de stock
B. Se ocultan por defecto y se pueden mostrar con una opción
C. Se muestran igual que los activos, también con alerta de stock
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q4. ¿Qué nombres usamos para los tipos de ajuste de stock?

Hoy hay tres: "Agregar stock (compra / reabastecimiento)", "Ajuste positivo (conteo físico mayor)" y "Ajuste negativo (conteo físico menor)". Los usuarios objetivo son poco afines a la tecnología.

A. Los mismos tres tipos con nombres más simples, por ejemplo "Llegó mercancía", "Sobró al contar", "Faltó al contar"
B. Los mismos tres tipos, con los nombres de hoy
C. Solo dos opciones: "Entrada" y "Salida", con el motivo para explicar
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. ¿Qué pasa al eliminar una categoría que tiene productos?

Hoy se elimina y sus productos quedan sin categoría, sin aviso de cuántos son.

A. Igual que hoy, pero el aviso de confirmación dice cuántos productos quedarán sin categoría
B. Igual que hoy, sin cambios en el aviso
C. No se permite eliminar una categoría que tenga productos
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. ¿Cuántos productos maneja un negocio típico?

Define qué tan rápido debe responder el listado y si hace falta paginarlo.

A. Menos de 500
B. Entre 500 y 2 000
C. Más de 2 000
D. Not identified
X. Other (please specify)

[Answer]: A

## Q7. ¿Los cajeros ven el historial de ajustes de stock?

En Q1 elegiste que los cajeros puedan ajustar stock sin crear, editar ni eliminar productos o categorías. Cada ajuste ya guarda quién lo hizo.

A. Sí, ven todo el historial, igual que el administrador
B. Solo ven los ajustes que ellos mismos hicieron
C. No ven el historial; solo el administrador
D. Not yet defined
X. Other (please specify)

[Answer]: C
