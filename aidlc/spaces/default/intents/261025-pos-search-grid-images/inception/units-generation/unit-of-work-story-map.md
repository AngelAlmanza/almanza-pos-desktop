# Mapa de requisitos a unidades

Este plan no incluye la etapa de historias de usuario (`stories.md`), así que cada fila es un requisito funcional `FR` de `requirements.md`. Al final se agregan algunas filas `NFR` como referencia.

| Requisito | Resumen | Unidad | Directorio |
|---|---|---|---|
| FR1 | Sugerencias de búsqueda en vivo | U2 | u2-search-suggestions |
| FR1.1 | Mostrar sugerencias desde 3 caracteres | U2 | u2-search-suggestions |
| FR1.2 | Regla: contiene, sin mayúsculas ni acentos, solo activos | U2 | u2-search-suggestions |
| FR1.3 | Máximo 10, 3 visibles con scroll | U2 | u2-search-suggestions |
| FR1.4 | Contenido de la sugerencia | U2 | u2-search-suggestions |
| FR1.5 | Teclado ↑/↓/Enter/Esc y clic | U2 | u2-search-suggestions |
| FR1.6 | Reiniciar el resaltado al cambiar el texto | U2 | u2-search-suggestions |
| FR1.7 | Agregar con el flujo actual (granel y stock) | U2 | u2-search-suggestions |
| FR1.8 | Sugerencia agotada no se agrega | U2 | u2-search-suggestions |
| FR1.9 | "Sin coincidencias" | U2 | u2-search-suggestions |
| FR1.10 | Cierre de la lista | U2 | u2-search-suggestions |
| FR1.11 | Ignorar respuestas viejas | U2 | u2-search-suggestions |
| FR1.12 | Conservar Enter y el modal actuales | U2 | u2-search-suggestions |
| FR2 | Vista de cuadrícula | U3 | u3-pos-grid-view |
| FR2.1 | Alternar lista y cuadrícula | U3 | u3-pos-grid-view |
| FR2.2 | Barra, carrito y cobro visibles en ambas vistas | U3 | u3-pos-grid-view |
| FR2.3 | Contenido de la tarjeta (incluida la foto) | U3 | u3-pos-grid-view |
| FR2.4 | Agrupar por categoría, "Sin categoría" al final | U3 | u3-pos-grid-view |
| FR2.5 | Ordenar por nombre, precio o stock asc/desc | U3 | u3-pos-grid-view |
| FR2.6 | Filtro con la barra desde el 1.er carácter | U3 | u3-pos-grid-view |
| FR2.7 | Ocultar grupos sin coincidencias | U3 | u3-pos-grid-view |
| FR2.8 | Agregar al tocar la tarjeta | U3 | u3-pos-grid-view |
| FR2.9 | Tarjeta agotada atenuada y no agregable | U3 | u3-pos-grid-view |
| FR2.10 | Estados de carga, error y vacíos | U3 | u3-pos-grid-view |
| FR2.11 | Stock actualizado tras cobrar | U3 | u3-pos-grid-view |
| FR2.12 | Escaneo en vista de cuadrícula | U3 | u3-pos-grid-view |
| FR3 | Preferencia de vista por sesión | U3 | u3-pos-grid-view |
| FR3.1 | Recordar la última vista en la sesión de login | U3 | u3-pos-grid-view |
| FR3.2 | Fuera de la base de datos | U3 | u3-pos-grid-view |
| FR3.3 | Lista por defecto | U3 | u3-pos-grid-view |
| FR3.4 | Olvidar al cerrar sesión | U3 | u3-pos-grid-view |
| FR3.5 | Valor inválido → lista | U3 | u3-pos-grid-view |
| FR4 | Imagen opcional de producto | U1 | u1-product-image |
| FR4.1 | Imagen opcional al crear o editar | U1 | u1-product-image |
| FR4.2 | Selector nativo, archivos locales | U1 | u1-product-image |
| FR4.3 | PNG/JPG/WebP, 5 MB máximo | U1 | u1-product-image |
| FR4.4 | Rechazos con motivo, sin perder el formulario | U1 | u1-product-image |
| FR4.5 | Vista previa y botón Quitar | U1 | u1-product-image |
| FR4.6 | Copiar a la carpeta de la app al guardar | U1 | u1-product-image |
| FR4.7 | Cancelar no copia ni borra | U1 | u1-product-image |
| FR4.8 | Quitar borra la copia | U1 | u1-product-image |
| FR4.9 | Reemplazar borra la anterior; guardado atómico | U1 | u1-product-image |
| FR4.10 | Eliminar producto borra su copia | U1 | u1-product-image |
| FR4.11 | No tocar el archivo original | U1 | u1-product-image |
| FR4.12 | Placeholder sin imagen o con archivo faltante | U1 | u1-product-image |
| FR4.13 | Productos existentes sin imagen | U1 | u1-product-image |
| FR4.14 | Dónde se muestran las imágenes | U1 | u1-product-image |
| NFR1 | Sugerencias en 300 ms o menos | U2 | u2-search-suggestions |
| NFR2 | Rendimiento de la cuadrícula con imágenes | U3 | u3-pos-grid-view |
| NFR4 | Seguridad de archivos de imagen | U1 | u1-product-image |

## Requisitos que abarcan varias unidades

| Requisito | Unidad principal | También toca | Cómo |
|---|---|---|---|
| FR4.12 (placeholder) | U1 (formulario) | U3 (tarjeta) | Cada unidad muestra el placeholder en su superficie; el criterio es el mismo |
| FR4.14 (dónde se muestran) | U1 | U3 | U3 muestra la foto en la tarjeta mediante el contrato de U1 |
| FR2.3 (foto en la tarjeta) | U3 | U1 | Consume el contrato de imagen; sin U1 muestra el placeholder |
| FR2.6 (filtro) | U3 | U2 | Usa la regla de coincidencia de U2 |
| FR2.8 y FR1.7 (flujo de agregado) | U2 / U3 | — | Reutilizan el mismo flujo de selección |
| NFR2 (rendimiento con imágenes) | U3 | U1 | Depende del mecanismo para servir imágenes que define U1 |
| NFR3 (escáner) | U2 | U3 | Ambas vistas conservan el flujo de Enter |
| NFR5 (integridad de datos) | U1 | — | La migración preserva los productos existentes |
| NFR6 y NFR7 (accesibilidad y pruebas) | Todas | — | Cada unidad cubre su superficie y sus pruebas |

## Orden de implementación dentro de cada unidad

- **U1**: migración y modelo → puerto y adaptador de almacenamiento con validación → casos de uso y comandos → contrato de visualización → servicio TS → `ProductImageField` y diálogo → pruebas.
- **U2**: regla de coincidencia y normalización → lógica de sugerencias (retardo, secuencia, límite) → lista y teclado en `PosSearchBar` → integración con el flujo de selección → pruebas de regresión del Enter.
- **U3**: preferencia de vista y selector → agrupado, orden y filtro (lógica pura) → `ProductCard` y `ProductGrid` con sus estados → distribución y `CompactCart` → recarga tras la venta → pruebas.

## Verificación de cobertura

- Los 47 requisitos `FR` de `requirements.md` (FR1–FR4 y sus 43 sub-requisitos) tienen unidad asignada: U1 tiene 15, U2 tiene 13 y U3 tiene 19.
- Cada unidad tiene filas asignadas.
- No hay requisitos `FR` sin unidad.

## Sources

- `requirements-analysis/requirements.md` (IDs FR y NFR).
- `unit-of-work.md` y `unit-of-work-dependency.md`.
