# Preguntas de Units Generation — cómo dividir el trabajo

La aplicación es un solo ejecutable de escritorio (Tauri), así que todas las partes se entregan juntas en la misma app: no hay despliegues independientes. Lo que se decide aquí es cómo agrupar el trabajo para construirlo y probarlo por partes. Este plan no incluye la etapa de Domain Design, así que se usa como base el inventario de componentes del código actual (`codekb/almanza-pos-desktop/component-inventory.md`). Responde con la letra o con tus palabras después de `[Answer]:`.

---

## Pregunta 1 — Granularidad de las partes
Hay tres capacidades: (1) imagen de producto (columna nueva, almacenamiento de archivos y campo en el formulario), (2) sugerencias de búsqueda en el POS y (3) vista de cuadrícula con preferencia de vista. Las sugerencias y la cuadrícula comparten la misma regla de coincidencia (contiene, sin mayúsculas ni acentos).

A. Tres partes por capacidad: imagen de producto, sugerencias y cuadrícula. La regla de coincidencia vive en la parte de sugerencias y la cuadrícula la reutiliza
B. Cuatro partes: las tres anteriores más una parte pequeña y compartida con la regla de coincidencia y normalización de texto, de la que dependen sugerencias y cuadrícula
C. Dos partes gruesas: (1) imagen de producto, de backend a formulario, y (2) mejoras del POS, con sugerencias, cuadrícula y preferencia de vista juntas
X. Other (please specify)

[Answer]: A

## Pregunta 2 — Dependencia entre la cuadrícula y las imágenes
Las tarjetas de la cuadrícula muestran la imagen del producto, o el placeholder si no tiene.

A. La cuadrícula depende de la parte de imagen: se construye cuando el producto ya tiene su campo de imagen y la forma de mostrarla
B. Independientes: la cuadrícula se construye mostrando el placeholder y, cuando llega la parte de imagen, la tarjeta empieza a mostrar la foto (el contrato del campo de imagen se fija desde el principio)
X. Other (please specify)

[Answer]: X. Son independientes, la foto si debe mostrarse en las tarjetas, pero si no tiene o esta cargando usa la imagen placeholder
