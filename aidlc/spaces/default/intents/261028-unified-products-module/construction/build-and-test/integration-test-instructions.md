# Instrucciones de pruebas de integración — Módulo de Productos unificado

## Marco y alcance

- El entorno de pruebas es Vitest en `node` (sin DOM, sin jsdom). Por eso no hay pruebas automáticas de integración de componentes de React. Las fronteras clave se cubren así:
  - **Frontend ↔ comandos de Tauri:** el módulo reutiliza `ProductService`, `CategoryService` e `InventoryService` sin cambiar su contrato; las pruebas de Rust (`cargo test`, 135 casos) cubren los comandos y el redondeo de dinero y stock.
  - **Reglas de negocio del módulo:** funciones puras cubiertas por Vitest (ver `unit-test-instructions.md` de Code Generation).
  - **Interfaz completa:** verificación manual guiada (abajo).

## Comandos

```bash
npm test
cd src-tauri && cargo test
```

## Recorrido manual de integración (pendiente de la persona)

Con `npm run tauri dev` y la base de datos de la aplicación:

| # | Rol | Pasos | Resultado esperado |
|---|-----|-------|--------------------|
| 1 | Administrador | Abrir el menú | Se ve "Productos"; no se ven "Categorías" ni "Inventario" |
| 2 | Administrador | Abrir `/inventory` y `/categories` | Redirigen a Productos (Inventario a "Historial de stock") |
| 3 | Administrador | Crear un producto con stock inicial 10 | Aparece con stock 10 y su estado |
| 4 | Administrador | "Ajustar stock" → "Faltó al contar" 3 | Vista previa "Quedará 7"; al guardar se actualizan el listado y el resumen sin recargar |
| 5 | Administrador | Escribir un nombre y una descripción muy largos | Cada uno se corta a dos líneas con "…" |
| 6 | Administrador | Crear una categoría con nombre largo | En el panel el nombre se corta; el conteo (círculo) no queda bajo editar ni eliminar |
| 7 | Administrador | Ocultar columnas con "Columnas" a 1024 px | La tabla cabe o se desplaza; por defecto todas visibles |
| 8 | Administrador | Revisar la fila de filtros | "Estado de stock:" y las pestañas quedan centradas con "Columnas" y "Mostrar inactivos" |
| 9 | Cajero | Abrir Productos | Solo lista, filtros, resumen y "Ajustar stock"; sin crear, editar, eliminar, categorías ni historial |
| 10 | Cajero | Abrir `/inventory` | Llega a Productos |
| 11 | Ambos | Vender un producto en el POS y volver | El stock se refleja; el POS no cambió |

## Cobertura esperada

- Todo el comportamiento con reglas está en funciones puras cubiertas por Vitest.
- Los pasos 1–11 no tienen prueba automática: quedan como verificación manual registrada en `test-results.md`.

## Datos y entorno

Usar una base de datos de prueba con al menos un producto a granel, uno por pieza, uno inactivo y una categoría sin productos. Usuarios: `root` / `root` (administrador) y un cajero.
