# Reglas de negocio — U1 product-image

El bloque YAML es la fuente de verdad. La tabla al final es un resumen.

```yaml
rules:
  - id: BR1.1
    name: Extensión permitida
    category: validation
    applies_to: ImageSourceFile
    trigger: Al elegir un archivo en el formulario y otra vez al guardar el producto
    logic: SI la extensión del archivo (sin distinguir mayúsculas) no es png, jpg, jpeg o webp ENTONCES se rechaza
    violation: "Error 'Formato no permitido. Usa PNG, JPG o WebP.'; el cambio pendiente no se modifica"
    source: [FR4.2, FR4.3, FR4.4]

  - id: BR1.2
    name: Firma del archivo coincide con un formato permitido
    category: validation
    applies_to: ImageSourceFile
    trigger: Al elegir y al guardar
    logic: >
      SI los primeros bytes del archivo no corresponden a la firma de PNG
      (89 50 4E 47 0D 0A 1A 0A), JPEG (FF D8 FF) o WebP ("RIFF" ... "WEBP")
      ENTONCES se rechaza. El formato detectado por firma es el que vale, aunque
      no coincida con la extensión (por ejemplo, un PNG llamado .jpg se guarda
      como .png).
    violation: "Error 'El archivo no es una imagen PNG, JPG o WebP válida.'"
    source: [FR4.4]

  - id: BR1.3
    name: Tamaño máximo 5 MB
    category: validation
    applies_to: ImageSourceFile
    trigger: Al elegir y al guardar
    logic: SI el tamaño es mayor que 5 242 880 bytes (5 MiB) o es 0 ENTONCES se rechaza
    violation: "Error 'La imagen pesa {n} MB. El máximo es 5 MB.' (o 'El archivo está vacío.')"
    source: [FR4.3, FR4.4]

  - id: BR1.4
    name: El archivo de origen existe y se puede leer
    category: validation
    applies_to: ImageSourceFile
    trigger: Al elegir y al guardar
    logic: SI la ruta no existe, no es un archivo regular o no se puede leer ENTONCES se rechaza nombrando el motivo
    violation: "Error 'No se encontró el archivo.' o 'No hay permiso para leer el archivo.'; el formulario conserva lo capturado"
    source: [FR4.4]

  - id: BR2.1
    name: La copia se crea solo al guardar
    category: policy
    applies_to: StoredProductImage
    trigger: Crear o actualizar un producto con ImageChange = replace
    logic: >
      Elegir o inspeccionar un archivo nunca escribe en la carpeta de imágenes.
      Al guardar, SI el cambio es replace ENTONCES se valida el origen
      (BR1.1–BR1.4), se crea la carpeta si falta y se copia el archivo con el
      nombre <uuid-v4>.<ext del formato detectado>, escribiendo primero un
      archivo temporal en la misma carpeta y renombrándolo al nombre final.
    violation: "Si la copia falla: 'No se pudo guardar la imagen: {motivo}'; el producto no cambia"
    source: [FR4.6, FR4.7]

  - id: BR2.2
    name: Guardado todo o nada respecto a la base
    category: constraint
    applies_to: [Product, StoredProductImage]
    trigger: Crear o actualizar un producto con replace o remove
    logic: >
      Orden: (1) validar el producto y la imagen; (2) si es replace, crear la
      copia nueva; (3) escribir el producto con su image_file nuevo en una sola
      transacción; (4) SI la transacción falla ENTONCES borrar la copia nueva y
      devolver el error; (5) SI la transacción tiene éxito y había una copia
      anterior distinta ENTONCES borrar la copia anterior.
    violation: "El producto conserva su imagen anterior y no queda una copia nueva huérfana"
    source: [FR4.9, NFR5]

  - id: BR2.3
    name: Quitar la imagen
    category: policy
    applies_to: Product
    trigger: Actualizar con ImageChange = remove
    logic: SI el producto tenía imagen ENTONCES se guarda image_file = nulo y, después de confirmar, se borra su copia. SI no tenía, no pasa nada
    violation: No aplica
    source: [FR4.8]

  - id: BR2.4
    name: Borrar la copia al eliminar el producto
    category: policy
    applies_to: [Product, StoredProductImage]
    trigger: Eliminar un producto
    logic: >
      SI la eliminación del producto se confirma en la base ENTONCES se borra su
      copia. SI la eliminación se rechaza (por ejemplo, porque el producto tiene
      ventas, regla existente) ENTONCES la copia no se toca.
    violation: No aplica
    source: [FR4.10]

  - id: BR2.5
    name: El original nunca se toca
    category: constraint
    applies_to: ImageSourceFile
    trigger: Cualquier operación de imagen
    logic: El archivo elegido por el usuario solo se abre en modo lectura; ninguna operación lo escribe, mueve, renombra o borra
    violation: No aplica (garantía de diseño, verificada con pruebas)
    source: [FR4.11]

  - id: BR2.6
    name: Referencias confinadas a la carpeta de imágenes
    category: constraint
    applies_to: [Product, StoredProductImage]
    trigger: Antes de leer, borrar o mostrar una copia a partir de image_file
    logic: >
      SI image_file no cumple el formato <uuid-v4>.(png|jpg|webp) (por ejemplo,
      contiene '/', '\\', '..', ':' o es absoluto) ENTONCES se trata como
      "sin imagen": no se lee, no se borra nada y se muestra el placeholder. La
      ruta final siempre se construye como carpeta-de-imágenes + image_file.
    violation: "Se registra una advertencia; ningún error bloquea al usuario"
    source: [NFR4]

  - id: BR2.7
    name: Falla al borrar una copia vieja no revierte el guardado
    category: policy
    applies_to: StoredProductImage
    trigger: Paso de borrado de BR2.2, BR2.3 o BR2.4
    logic: SI no se puede borrar la copia anterior ENTONCES el guardado se considera exitoso, se registra una advertencia y el archivo queda huérfano
    violation: "Advertencia en el registro de la app; el usuario no ve error"
    source: [FR4.8, FR4.9, FR4.10]

  - id: BR3.1
    name: Cuándo se muestra el placeholder
    category: policy
    applies_to: ProductImageDisplay
    trigger: Mostrar un producto en el formulario o en una tarjeta
    logic: >
      SI image_file es nulo o inválido (BR2.6), o la imagen no ha terminado de
      cargar, o falla al cargar (archivo borrado, dañado o ilegible) ENTONCES
      se muestra el placeholder. En el formulario, el archivo faltante muestra
      además la nota 'No se encontró la imagen guardada'.
    violation: No aplica
    source: [FR4.12]

  - id: BR3.2
    name: Acceso de la pantalla limitado a la carpeta de imágenes
    category: authorization
    applies_to: ProductImageDisplay
    trigger: Configuración de la app
    logic: >
      La pantalla solo puede abrir archivos locales de la carpeta de imágenes
      de producto mediante el protocolo de archivos de la app; cualquier otra
      ruta queda fuera de su alcance.
    violation: "La imagen no carga y se muestra el placeholder (BR3.1)"
    source: [NFR2, NFR4]

  - id: BR3.3
    name: Las imágenes solo se muestran en cuadrícula y formulario
    category: policy
    applies_to: ProductImageDisplay
    trigger: Diseño de pantallas
    logic: El contrato de visualización se usa en la tarjeta del POS (U3) y en el formulario; tickets, reportes y tablas no lo usan
    violation: No aplica
    source: [FR4.14]

  - id: BR4.1
    name: Migración conserva productos existentes
    category: constraint
    applies_to: Product
    trigger: Primer arranque con la versión nueva
    logic: Se agrega la columna opcional image_file sin valor por defecto (nulo); ninguna fila existente cambia en ningún otro campo. SQLite no permite ADD COLUMN con UNIQUE, así que la unicidad se garantiza con un índice único parcial (WHERE image_file IS NOT NULL) creado en la misma migración; varias filas pueden tener nulo
    violation: "Si la migración falla, la app no arranca con un mensaje de error de migración (comportamiento existente)"
    source: [FR4.13, NFR5]

  - id: BR5.1
    name: Interpretación del cambio de imagen
    category: validation
    applies_to: ImageChange
    trigger: Recibir una creación o actualización de producto
    logic: >
      Sin cambio de imagen = keep. replace exige source_path no vacío. remove
      y keep no llevan source_path. En una creación, remove no es válido.
    violation: "Error 'Cambio de imagen no válido.'"
    source: [FR4.1, FR4.8]

  - id: BR5.2
    name: Quitar es reversible hasta guardar
    category: policy
    applies_to: ImageChange
    trigger: Pulsar Quitar o Cancelar en el formulario
    logic: >
      Quitar solo marca el cambio pendiente remove; Deshacer vuelve al cambio
      anterior; Cancelar descarta cualquier cambio pendiente. Nada se copia ni
      se borra hasta Guardar.
    violation: No aplica
    source: [FR4.5, FR4.7, FR4.8]
```

## Resumen

| ID | Regla | Tipo | Fuente |
|---|---|---|---|
| BR1.1 | Extensión png, jpg, jpeg o webp | validation | FR4.2–FR4.4 |
| BR1.2 | La firma coincide con PNG, JPEG o WebP | validation | FR4.4 |
| BR1.3 | Tamaño de 1 byte a 5 MiB | validation | FR4.3, FR4.4 |
| BR1.4 | El origen existe y se puede leer | validation | FR4.4 |
| BR2.1 | Copia solo al guardar, temporal y luego renombrada | policy | FR4.6, FR4.7 |
| BR2.2 | Todo o nada; borrar la copia vieja después de confirmar | constraint | FR4.9, NFR5 |
| BR2.3 | Quitar → nulo y borrar la copia | policy | FR4.8 |
| BR2.4 | Eliminar el producto borra su copia | policy | FR4.10 |
| BR2.5 | El original nunca se toca | constraint | FR4.11 |
| BR2.6 | Referencia confinada (sin rutas) | constraint | NFR4 |
| BR2.7 | Falla al borrar la copia vieja = advertencia | policy | FR4.8–FR4.10 |
| BR3.1 | Cuándo se muestra el placeholder | policy | FR4.12 |
| BR3.2 | La pantalla solo accede a la carpeta de imágenes | authorization | NFR2, NFR4 |
| BR3.3 | Dónde se muestran las imágenes | policy | FR4.14 |
| BR4.1 | La migración conserva los productos | constraint | FR4.13, NFR5 |
| BR5.1 | Cambio de imagen: keep, replace o remove | validation | FR4.1, FR4.8 |
| BR5.2 | Quitar es reversible hasta guardar | policy | FR4.5, FR4.7, FR4.8 |

## Sources

- `requirements-analysis/requirements.md`: FR4.1–FR4.14 y AC4.1–AC4.9, NFR2, NFR4, NFR5.
- `refined-mockups/interaction-spec.md`: `ProductImageField`.
- `functional-design-questions.md`: Q1 = A, Q2 = A.
- Código actual: `src-tauri/src/modules/catalog/products/application.rs` (validaciones existentes y regla de no eliminar con ventas).

## Assumptions & Open Questions

- [assumption] 5 MB se interpreta como 5 MiB (5 242 880 bytes).
- [assumption] Validar solo la firma (Q2 = A) acepta archivos con un encabezado válido pero dañados por dentro; esos casos los cubre BR3.1 mostrando el placeholder.
- [assumption] Las advertencias de BR2.6 y BR2.7 van al registro estándar de la app (`eprintln!`/log) porque no hay un sistema de observabilidad.
