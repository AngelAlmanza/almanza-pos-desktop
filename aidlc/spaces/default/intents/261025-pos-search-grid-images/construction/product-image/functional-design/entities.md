# Entidades — U1 product-image

Modelo lógico de los datos que esta unidad agrega o cambia. El bloque YAML es la fuente de verdad. El diagrama entidad-relación está en `functional-spec.md`.

```yaml
entities:
  - name: Product
    description: >
      Producto del catálogo (entidad existente). Esta unidad le agrega una
      referencia opcional a su imagen. Los demás atributos no cambian.
    attributes:
      - name: id
        type: integer
        required: true
        unique: true
        constraints: [identificador existente, generado por la base]
      - name: image_file
        type: string
        required: false
        unique: true
        default: null
        constraints:
          - "Solo el nombre de archivo, nunca una ruta: formato <uuid-v4>.<ext> con ext en {png, jpg, webp}"
          - "No contiene separadores de ruta, '..' ni prefijos de unidad"
          - "Nulo significa: el producto no tiene imagen"
        references: StoredProductImage.file_name
    constraints:
      - "Los productos existentes antes del cambio quedan con image_file nulo (FR4.13)"
      - "Activar o desactivar un producto no cambia image_file"
    relationships:
      - target: StoredProductImage
        cardinality: "0..1 a 0..1"
        direction: "Product -> StoredProductImage"
        note: "Cada copia pertenece a un solo producto; un producto tiene como máximo una copia vigente"

  - name: StoredProductImage
    description: >
      Copia de la imagen guardada por la aplicación en la carpeta de imágenes
      de producto, dentro de la carpeta de datos de la app. Es un archivo, no
      una fila de la base; la base solo guarda su nombre en Product.image_file.
    attributes:
      - name: file_name
        type: string
        required: true
        unique: true
        constraints: ["<uuid-v4>.<ext>", "generado por la aplicación, nunca por el usuario"]
      - name: format
        type: enum
        required: true
        allowed_values: [png, jpeg, webp]
      - name: size_bytes
        type: integer
        required: true
        min: 1
        max: 5242880
      - name: directory
        type: string
        required: true
        constraints: ["<carpeta de datos de la app>/product-images", "única carpeta donde la unidad escribe o borra"]
    constraints:
      - "La extensión del nombre corresponde al formato detectado por firma (jpeg se guarda como .jpg)"
      - "Nunca se modifica después de escrita; cambiar la imagen crea una copia nueva"

  - name: ImageSourceFile
    description: >
      Archivo original que el administrador elige en su equipo. La aplicación
      solo lo lee; nunca lo modifica, mueve ni borra (FR4.11).
    attributes:
      - name: path
        type: string
        required: true
        constraints: ["ruta absoluta devuelta por el selector nativo"]
      - name: extension
        type: enum
        required: true
        allowed_values: [png, jpg, jpeg, webp]
      - name: size_bytes
        type: integer
        required: true
        max: 5242880
      - name: detected_format
        type: enum
        required: true
        allowed_values: [png, jpeg, webp]
        constraints: ["se obtiene de los primeros bytes del archivo (firma)"]

  - name: ImageChange
    description: >
      Cambio de imagen que acompaña a una creación o actualización de producto.
      Hace explícito "no cambiar", "reemplazar" y "quitar", algo que hoy no
      expresa la actualización parcial basada en campos opcionales.
    attributes:
      - name: kind
        type: enum
        required: true
        allowed_values: [keep, replace, remove]
        default: keep
      - name: source_path
        type: string
        required: false
        constraints: ["obligatorio cuando kind = replace; prohibido en keep y remove"]
    constraints:
      - "En una creación, solo se admiten keep (sin imagen) y replace"
      - "remove sobre un producto sin imagen no hace nada y no es error"

  - name: ImagePreview
    description: >
      Resultado de inspeccionar un archivo elegido antes de guardar. Sirve para
      dar el error inmediato (FR4.4) y mostrar la vista previa sin copiar nada.
    attributes:
      - name: format
        type: enum
        required: true
        allowed_values: [png, jpeg, webp]
      - name: size_bytes
        type: integer
        required: true
      - name: preview
        type: string
        required: true
        constraints: ["data URL (data:<MIME detectado>;base64,...) listo para mostrarse una vez en el formulario; el archivo mide 5 MiB o menos, así que el valor ronda los 7 MiB"]

  - name: ProductImageDisplay
    description: >
      Contrato de visualización que consume U3 (y el formulario). A partir de
      Product.image_file produce una fuente mostrable o nada.
    attributes:
      - name: image_file
        type: string
        required: false
      - name: display_source
        type: string
        required: false
        constraints:
          - "Nulo si image_file es nulo o inválido (BR3.1); entonces se muestra el placeholder"
          - "Si no es nulo, apunta al archivo dentro de la carpeta de imágenes de producto mediante el protocolo de archivos limitado a esa carpeta (BR3.2)"
```

## Resumen

| Entidad | Tipo | Qué cambia |
|---|---|---|
| Product | Fila de la base (existente) | Nuevo atributo opcional `image_file` (solo el nombre del archivo) |
| StoredProductImage | Archivo en la carpeta de la app | Nuevo: la copia que la app administra y borra |
| ImageSourceFile | Archivo del usuario | Solo se lee; nunca se toca |
| ImageChange | Valor de una petición | Nuevo: `keep`, `replace` o `remove`; resuelve la limitación de no poder "quitar" con la actualización parcial actual |
| ImagePreview | Valor de respuesta | Nuevo: validación y vista previa antes de guardar |
| ProductImageDisplay | Contrato con U3 | Nuevo: de `image_file` a una fuente mostrable o el placeholder |

Guardar solo el nombre del archivo, y no la ruta absoluta como hace hoy el logotipo, tiene dos ventajas: la referencia sigue siendo válida aunque cambie la ubicación de la carpeta de datos, y es imposible que apunte fuera de la carpeta de imágenes (NFR4).

## Sources

- `requirements-analysis/requirements.md`: FR4.1–FR4.14, NFR2, NFR4, NFR5.
- `units-generation/unit-of-work.md` (U1, contrato con U3).
- `functional-design-questions.md`: Q1 = A (servir el archivo directo con el protocolo limitado), Q2 = A (validar por firma).
- Código actual: `src-tauri/src/models/product.rs` (`Product`, `UpdateProductRequest` con `Option<T>` como "no cambiar"), `src-tauri/src/modules/settings/adapters/outbound/filesystem.rs` (patrón del logotipo con ruta absoluta y base64).

## Assumptions & Open Questions

- [assumption] Los nombres usan UUID v4; la dependencia `uuid` ya está en el proyecto.
- [assumption] JPEG se guarda siempre con extensión `.jpg`, aunque el original sea `.jpeg`.
