# Preguntas de diseño funcional — U1 product-image

Casi todo lo de esta parte ya quedó decidido en los requisitos (FR4), en los mockups y en la división del trabajo. Quedan dos decisiones técnicas que afectan lo que verá el cajero en la cuadrícula y lo que quedará como contrato para U3. Responde con la letra o con tus palabras después de `[Answer]:`.

---

## Pregunta 1 — Cómo llega la imagen a la pantalla
El logotipo actual se envía a la pantalla como texto base64 (data URL), leyendo y codificando el archivo completo cada vez. Para una cuadrícula con cientos de productos e imágenes de hasta 5 MB, ese enfoque es lento y gasta memoria (NFR2: primeras tarjetas en 2 s o menos con 500 imágenes).

A. **Servir el archivo directamente** a la pantalla con el protocolo de archivos de Tauri, limitado a la carpeta de imágenes de producto. La pantalla carga cada imagen solo cuando la tarjeta aparece, pero carga el archivo original completo (hasta 5 MB)
B. **Generar una miniatura al guardar** (por ejemplo, de 320 px como máximo, en WebP o JPEG) y servir esa miniatura con el mismo protocolo limitado. La cuadrícula carga archivos pequeños y el formulario puede seguir mostrando la original. Requiere agregar una librería de imágenes de Rust (`image`), lo que también permite comprobar que el archivo realmente se puede abrir
C. **Igual que el logotipo**: un comando que devuelve el base64 de cada imagen bajo demanda, sin configurar nada nuevo. Es lo más simple, pero lo más lento con muchas imágenes
X. Other (please specify)

[Answer]: A

## Pregunta 2 — Qué tanto se valida que la imagen sea real
El requisito pide rechazar archivos cuyo contenido no sea PNG, JPEG o WebP, aunque la extensión lo sea (FR4.4). Un archivo con el encabezado correcto pero dañado por dentro es un caso más fino.

A. **Revisar la firma del archivo** (los primeros bytes que identifican PNG, JPEG o WebP), sin abrir la imagen completa. Un archivo dañado por dentro se aceptaría, pero en pantalla se vería el placeholder
B. **Abrir la imagen completa** para confirmar que se puede leer y rechazar las dañadas al guardar. Requiere la librería `image`, que ya se usaría si en la pregunta 1 eliges B
X. Other (please specify)

[Answer]: A
