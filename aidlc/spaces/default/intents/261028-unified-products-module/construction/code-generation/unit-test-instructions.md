# Instrucciones de pruebas unitarias — Módulo de Productos unificado

## Marco y configuración

- Marco: Vitest 4 (`vitest.config.ts`, entorno `node`, alias `@core` y `@modules`). No se agrega jsdom ni dependencias.
- Las pruebas cubren la lógica pura del módulo (estado de stock, filtros, ajuste, permisos, navegación, errores de formulario). Los componentes de React se verifican con `npm run build` y revisión manual (no hay entorno de DOM).
- Archivos nuevos, en `src/__tests__/modules/catalog/products/` salvo el de navegación:
  - `stockStatus.test.ts`
  - `stockAdjustment.test.ts`
  - `productPermissions.test.ts`
  - `categoryDeletion.test.ts`
  - `productFormErrors.test.ts`
  - `truncateText.test.ts` (revisión 1)
  - `columnVisibility.test.ts` (revisión 1)
  - `src/__tests__/core/layout/navItems.test.ts`

## Comandos de esta unidad (solo estos archivos)

Corredor listo antes de la primera prueba (verificado con una prueba existente del módulo):

```bash
npx vitest run src/__tests__/modules/catalog/products/productImage.test.ts
```

Pruebas del módulo unificado:

```bash
npx vitest run src/__tests__/modules/catalog/products/stockStatus.test.ts src/__tests__/modules/catalog/products/stockAdjustment.test.ts src/__tests__/modules/catalog/products/productPermissions.test.ts src/__tests__/modules/catalog/products/categoryDeletion.test.ts src/__tests__/modules/catalog/products/productFormErrors.test.ts src/__tests__/modules/catalog/products/truncateText.test.ts src/__tests__/modules/catalog/products/columnVisibility.test.ts src/__tests__/core/layout/navItems.test.ts
```

Regresión de la suite existente (la ejecuta Build and Test): `npm test` y `cd src-tauri && cargo test`.

## Estrategia y volumen (estándar, 5-8 casos por componente)

| Archivo | Casos | Cubre |
|---------|-------|-------|
| `stockStatus.test.ts` | 8 | FR2.2 (límites: stock = mínimo → Bajo; 5,001 con mínimo 5 → Normal; stock 0 con mínimo 0 → Agotado; stock negativo → Agotado), inactivo sin estado, resumen 10/2/1 con 3 inactivos (FR8), filtros combinados (FR9.1), conteo por categoría con "Sin categoría", orden sin acentos ni mayúsculas con desempate por id (FR2.5) |
| `stockAdjustment.test.ts` | 8 | Nombres de los tres tipos (FR5.2, FR7.3), vista previa suma y resta, "quedará 12" con stock 2 + 10, a granel 1,250 − 0,250 = 1,000, cantidad vacía/0/negativa, decimales en producto por pieza, hasta 3 decimales a granel, más de 3 decimales |
| `productPermissions.test.ts` | 5 | Tabla FR1.3 para administrador y cajero (cada acción), cajero sin historial ni categorías |
| `categoryDeletion.test.ts` | 4 | Mensaje con 0, 1 y 3 productos; incluye el nombre de la categoría (FR6.2) |
| `productFormErrors.test.ts` | 5 | Código de barras repetido → campo código; nombre; precio; mensaje desconocido → aviso general; conserva el texto original (FR3.3) |
| `truncateText.test.ts` | 5 | Texto corto sin cambios, límite exacto sin cortar, un carácter más → corta y agrega "…", cadena vacía, máximo ≤ 0 (revisión 1: nombres largos de categoría) |
| `columnVisibility.test.ts` | 6 | Por defecto todas visibles, ocultar una columna, volver a mostrarla conserva el orden, columnas fijas (Producto, Acciones) no se ocultan, claves desconocidas descartadas, ocultar todas deja solo las fijas (revisión 1) |
| `navItems.test.ts` | 6 | Menú del administrador y del cajero (FR1.1, FR1.3), sin "Categorías" ni "Inventario", redirecciones de `/categories` y `/inventory` (FR1.2) |

Regresión dirigida (alcance `bugfix`): los casos de límites del estado de stock y de la vista previa a granel son el control de regresión de las reglas que antes no existían (el aviso de stock bajo contaba `stock <= mínimo` sin distinguir "Agotado"); son pruebas unitarias porque ese es el nivel más estrecho que reproduce la regla.

## Cobertura esperada

- Todas las funciones exportadas de las utilidades nuevas con al menos un caso de camino feliz y dos de borde o error (regla de Construcción).
- El alcance `bugfix` no agrega piso de cobertura por línea; no se baja ni se desactiva ningún umbral existente.

## Mocks y datos de prueba

- Sin mocks de Tauri: las utilidades son funciones puras que reciben objetos `Product` literales.
- Fábrica local `makeProduct(overrides)` en cada archivo de prueba con los campos de `Product` (`id`, `name`, `stock`, `min_stock`, `active`, `category_id`, `is_bulk`, `unit`…). Sin base de datos ni red.
- Fechas y moneda no intervienen en estas pruebas.
