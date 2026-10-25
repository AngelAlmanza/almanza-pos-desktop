# Unidades de trabajo — Mejoras al POS: sugerencias, cuadrícula e imágenes

## Base de la descomposición

- **Arquitectura existente**: monolito de escritorio Tauri 2 con un backend Rust hexagonal por slices verticales y un frontend React modular por dominio (`codekb/almanza-pos-desktop/architecture.md`). Todo se entrega en un único ejecutable, así que ninguna unidad se despliega por separado. Las unidades son límites de construcción y de prueba, no de despliegue.
- **Componentes**: este plan no incluye Domain Design, así que no hay `components.md`. Los componentes se toman del inventario del código actual (`codekb/almanza-pos-desktop/component-inventory.md`) y de los componentes propuestos en `refined-mockups/interaction-spec.md`.
- **Estrategia**: una unidad por capacidad (respuesta P1 = A), con dependencias mínimas (respuesta P2: la cuadrícula es independiente de las imágenes).

| Unit ID | Directory | Nombre (`name`) | Kind | Complejidad | Despliegue |
|---|---|---|---|---|---|
| U1 | `u1-product-image` | `product-image` | `service` | M | Embebido en la app de escritorio |
| U2 | `u2-search-suggestions` | `search-suggestions` | `ui` | M | Embebido en la app de escritorio |
| U3 | `u3-pos-grid-view` | `pos-grid-view` | `ui` | L | Embebido en la app de escritorio |

---

## U1 — `product-image` (Imagen opcional de producto)

**Descripción**: permite asignar, cambiar y quitar una imagen opcional a un producto desde el diálogo Nuevo/Editar. La imagen se copia a la carpeta de datos de la app y la copia anterior se borra cuando corresponde.

**Kind**: `service`. Su núcleo es lógica del backend: esquema, almacenamiento de archivos, validación y comandos IPC. Incluye además el campo de formulario que la usa.

**Responsabilidades (lo que posee y entrega)**:
- **Esquema**: migración `0007` que agrega a `products` la referencia de imagen (anulable). El mapeo de `Product` se actualiza en Rust (catálogo y el `find_product` de `sales`) y en TypeScript.
- **Puerto de almacenamiento** de imágenes de producto (en `modules/catalog/products`) y su adaptador de sistema de archivos:
  - valida extensión, tamaño de 5 MB o menos y contenido decodificable PNG, JPEG o WebP (FR4.3, FR4.4);
  - copia con nombre único a la carpeta de imágenes de producto dentro de `app_data_dir` (FR4.6);
  - borra la copia anterior al quitar, reemplazar o eliminar el producto (FR4.8–FR4.10);
  - nunca escribe ni borra fuera de esa carpeta (NFR4) y nunca toca el original (FR4.11).
- **Casos de uso y comandos IPC**: crear y actualizar un producto con un cambio de imagen (ninguno, nueva ruta de origen o quitar), resolver la imagen de un producto para mostrarla y borrar la copia al eliminar el producto. El guardado es atómico respecto a la base: si falla, no queda una copia huérfana (FR4.9).
- **Contrato de visualización** (integración con U3): el campo opcional de imagen en `Product` y la forma de obtener una fuente mostrable en la WebView (FR4.12, NFR2). El mecanismo concreto (protocolo de assets acotado, comando de miniatura o data URL bajo demanda) se fija en Functional Design de U1, y U3 lo consume.
- **Frontend**:
  - `ProductImageField` (columna derecha del diálogo, estados `empty`, `saved`, `pending-new`, `pending-remove`, `error` y `missing`);
  - el diálogo de producto pasa a `maxWidth="md"`;
  - `ProductService` agrega las operaciones de imagen.

**Fuera de U1**: mostrar la imagen en la cuadrícula del POS (U3).

**Notas e implementación**:
- Reutilizar el patrón de `settings` (`SettingsImageStorage` + `LocalSettingsImageStorage`) como referencia, sin heredar sus riesgos: falta de validación de tamaño y tipo, sobrescritura por clave y archivos huérfanos (`code-quality-assessment.md`).
- Hoy `UpdateProductRequest` usa `Option<T>` como "no cambiar" y no permite escribir `NULL`. Quitar la imagen necesita una representación explícita del cambio.
- Pruebas: Rust (validación, rutas, borrado, migración que preserva productos) y Vitest para la lógica pura del campo.

---

## U2 — `search-suggestions` (Sugerencias de búsqueda en vivo)

**Descripción**: muestra, bajo la barra de búsqueda del POS en vista de lista, hasta 10 sugerencias (3 visibles) mientras el cajero escribe 3 o más caracteres. Agrega la elegida con el mismo flujo de hoy y conserva intacto el Enter y el escáner.

**Kind**: `ui`. Es una superficie de frontend. Si Functional Design decide filtrar en el backend con normalización de acentos, U2 incluye ese ajuste al comando de búsqueda.

**Responsabilidades**:
- **Regla de coincidencia compartida** (FR1.2): normalización sin mayúsculas ni acentos y "contiene" en nombre o código, solo productos activos. Se expone como una función o módulo reutilizable que U3 consume (respuesta P1 = A).
- **Lista de sugerencias** en `PosSearchBar`: retardo, número de secuencia para ignorar respuestas viejas, máximo 10 resultados y 3 filas visibles, estados `loading`, `empty` y `error` (FR1.1, FR1.3, FR1.9–FR1.11).
- **Teclado y selección**: ↑/↓/Enter/Esc/Tab y clic; el resaltado se reinicia con cada cambio de texto; Enter sin resaltado ejecuta el flujo actual (FR1.5, FR1.6, FR1.12, NFR3).
- **Selección y agregado**: reutiliza `handleProductSelected` (granel → `BulkQuantityDialog`), valida el stock y marca los agotados (FR1.7, FR1.8).
- Accesibilidad del combobox (NFR6).

**Fuera de U2**: el selector de vista y la regla de no mostrar sugerencias en la vista de cuadrícula. U2 expone una propiedad para desactivarlas y U3 la usa.

**Notas e implementación**:
- Hoy el `useCallback` de envío tiene dependencias incompletas y el foco vuelve al campo con cada cambio del carrito. Hay que conservar este último comportamiento (escáner).
- Pruebas: Vitest para la normalización (acentos, ñ, mayúsculas) y para la lógica de resaltado y reinicio; pruebas de regresión del flujo de Enter.

---

## U3 — `pos-grid-view` (Vista de cuadrícula y preferencia de vista)

**Descripción**: agrega al POS la vista de cuadrícula de productos activos, agrupada por categoría, ordenable y filtrada por la barra. Se alterna con la vista de lista y la preferencia dura lo que dura la sesión de login.

**Kind**: `ui`.

**Responsabilidades**:
- `ViewModeToggle` y la preferencia de vista ligada a la sesión de login, fuera de la base de datos y borrada en `logout` (FR2.1, FR3.1–FR3.5).
- `ProductGrid`:
  - carga de productos activos con `get_active_products`, que ya existe y no se usa;
  - filtro con la regla de U2 desde el primer carácter, agrupado alfabético con "Sin categoría" al final y orden por nombre, precio o stock ascendente o descendente (FR2.3–FR2.7);
  - estados de carga, error y vacíos, y recarga del stock tras cada venta (FR2.10, FR2.11).
- `ProductCard`: imagen o placeholder (sin imagen, cargando o con error), nombre, código, precio, stock, "A granel" y "Agotado" (FR2.3, FR2.9). Respuesta P2: la foto se muestra cuando existe y el placeholder cubre los casos sin imagen o cargando.
- **Agregado desde la tarjeta** con el mismo flujo de selección que la barra (FR2.8) y conservación del escaneo en esta vista (FR2.12, NFR3).
- **Distribución en cuadrícula**: el carrito pasa a la columna derecha de 360 px como `CompactCart`, con las mismas acciones del reductor (FR2.2). En cuadrícula se desactivan las sugerencias de U2.
- Carga diferida de imágenes y reserva del área de 120 px (NFR2).

**Notas e implementación**:
- Consume el contrato de visualización de imagen definido en U1. Mientras U1 no exista en la rama, la tarjeta muestra el placeholder (P2).
- La revisión de diseño dejó aceptados riesgos que Functional Design de U3 debe resolver: el foco tras tocar una tarjeta frente al escaneo (R-01 de Refined Mockups), el precio base en el carrito compacto (R-02), el estado sin caja abierta y la recarga fallida (R-04).
- Pruebas: Vitest para agrupado, orden con desempate, filtro y lectura y validación de la preferencia, y para el reductor sin cambios.

## Sources

- `requirements-analysis/requirements.md`: FR1–FR4, NFR1–NFR7.
- `refined-mockups/mockups.md` e `interaction-spec.md`: componentes, estados y distribución.
- `codekb/almanza-pos-desktop/architecture.md`, `component-inventory.md`, `code-structure.md`, `code-quality-assessment.md`: arquitectura existente y puntos de extensión.
- `units-generation-questions.md`: P1 = A (tres partes), P2 = independientes con foto o placeholder.

## Assumptions & Open Questions

- [assumption] U1 se clasifica como `service` porque su núcleo es backend (esquema, almacenamiento, comandos), aunque incluye el campo del formulario.
- [assumption] La regla de coincidencia vive en U2 como módulo reutilizable; U3 la importa.
- Abierta para Functional Design de U1: el mecanismo para servir imágenes a la WebView (afecta a NFR2 y es el contrato que consume U3).
- Abierta para Functional Design de U2: filtrar en el cliente o en el backend (NFR1).
