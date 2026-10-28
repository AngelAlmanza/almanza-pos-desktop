# Instrucciones de pruebas — U3 pos-grid-view

## Marco y configuración

- Frontend: Vitest 4 con `environment: 'node'` (`vitest.config.ts`, alias `@modules`). Las pruebas son de lógica pura, sin DOM; los componentes y los hooks se verifican a mano con la app corriendo.
- No hay pruebas de Rust nuevas: la unidad no toca el backend.
- Ninguna prueba toca la base de datos ni el disco: la preferencia de vista usa un almacenamiento falso inyectado.

## Cómo correr las pruebas de esta unidad

Todos los comandos están acotados a U3. No se usa `npm test` sin filtro.

```bash
# Preferencia de vista (lectura, escritura, borrado, valores inválidos)
npx vitest run src/__tests__/modules/pos/utils/viewMode.test.ts

# Agrupado, orden y reductor de estados de la cuadrícula
npx vitest run src/__tests__/modules/pos/utils/productGrid.test.ts
```

Comando de verificación del ejecutor (Step 1, antes de agregar pruebas): `npx vitest run src/__tests__/modules/pos/utils`.

## Cobertura esperada

Estrategia Standard: de 5 a 8 pruebas por componente, más pruebas en las fronteras clave. El alcance `refactor` no agrega un mínimo de cobertura. El conjunto existente (incluidas las pruebas de `posReducer` y de las sugerencias de U2) debe seguir en verde. No se baja ningún umbral.

| Componente | Pruebas | Casos |
|---|---|---|
| Preferencia de vista (`viewMode.ts`) | 8 | lectura válida de lista; lectura válida de cuadrícula; otro usuario devuelve lista; valor inválido; JSON ilegible; almacenamiento que lanza error al leer; guardado correcto; borrado |
| Agrupado (`groupProducts`) | 6 | grupos alfabéticos; acentos y mayúsculas; "Sin categoría" al final; producto sin categoría; grupo sin productos omitido; conteo por grupo |
| Orden (`sortProducts`) | 7 | nombre ascendente; nombre descendente; precio descendente (10.00, 25.50, 8.00); precio ascendente; stock ascendente; desempate por nombre; desempate por id |
| Reductor de estados (`gridReducer`) | 8 | primera carga; vacío del catálogo; vacío por filtro; respuesta vigente; respuesta vieja descartada; recarga que conserva las tarjetas; recarga fallida a `stale`; texto de solo espacios |
| Regresión del carrito | 23 | las pruebas existentes de `posReducer` siguen en verde (el reductor no cambia) |

## Mocks y datos de prueba

- Almacenamiento falso con `getItem`, `setItem` y `removeItem` en memoria, y una variante que lanza error.
- `Product` mínimos construidos en la prueba, con y sin `category_id` y `category_name`, con acentos y con stock 0.
- Sin mocks de Tauri: las funciones puras reciben datos literales.

## Verificación manual (Build and Test)

No hay entorno de DOM, así que estos puntos se confirman con la app corriendo: cambiar de vista y volver al POS, preferencia al cerrar sesión (incluida la sesión caducada), escaneo justo después de tocar una tarjeta (se agrega una sola vez el producto escaneado), tarjeta agotada con aviso, producto a granel, teclado sobre las tarjetas, carrito compacto con precio base, recarga de stock tras una venta, imágenes con carga diferida y la medición de NFR2 con 1 000 productos y 500 imágenes.

## Datos y limpieza

Las pruebas no crean archivos ni escriben en el almacenamiento real del navegador.

## Sources

- `functional-design/functional-spec.md` y `frontend-components.md` (pruebas previstas).
- `code-generation-plan.md` (Testing Contract, pasos 1, 3, 5 y 7).

## Assumptions & Open Questions

- [assumption] Los nombres de los archivos de prueba son `viewMode.test.ts` y `productGrid.test.ts`; si cambian durante la generación, los comandos se actualizan aquí.
- [assumption] El reductor de estados vive en `productGrid.ts`; si se mueve a otro archivo, se actualiza el comando correspondiente.
