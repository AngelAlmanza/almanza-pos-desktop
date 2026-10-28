# Instrucciones de pruebas de rendimiento

## Objetivos medibles

| ID | Fuente | Objetivo |
|---|---|---|
| NFR1 | `requirements.md` NFR1 | Con 5 000 productos activos, la lista de sugerencias aparece en ≤300 ms desde que el cajero deja de escribir |
| NFR2a | `requirements.md` NFR2 | Con 1 000 productos activos y 500 imágenes de hasta 5 MB, las primeras tarjetas aparecen en ≤2 s al activar la cuadrícula |
| NFR2b | `requirements.md` NFR2 | Filtrar u ordenar actualiza la cuadrícula en ≤500 ms |
| NFR2c | `requirements.md` NFR2 | Las imágenes no se cargan todas a la vez como texto base64 |

## NFR1 — parte del backend (ya medida)

Se midió con una prueba temporal (no se conserva en el repositorio): 5 000 productos en SQLite en memoria, `find_active` + `matching::rank` con límite 10, compilación de depuración (el peor caso), mejor de 5 corridas.

| Término | Mejor tiempo |
|---|---|
| `jam` (coincide en nombre) | 69 ms |
| `nand` (acento y `ñ`) | 64 ms |
| `7500000` (código de barras) | 70 ms |
| `zzz` (sin coincidencias) | 38 ms |

El plazo de NFR1 incluye la espera de 200 ms (`SUGGEST_DEBOUNCE_MS`) antes de pedir las sugerencias. Presupuesto: 200 ms de espera + hasta 70 ms de backend = 270 ms de 300 ms antes de sumar el IPC y el pintado. En una compilación de producción el backend es bastante más rápido, pero el margen es corto y no está medido de punta a punta.

## NFR1 — medición de punta a punta (pendiente, requiere la app)

1. Generar 5 000 productos activos (script SQL sobre `pos.db`, copia de respaldo antes).
2. `npm run tauri build -- --debug` o `npm run tauri dev`; abrir el POS.
3. Escribir `jam` y medir, con las herramientas de desarrollo de la WebView, desde el último `keydown` hasta que aparece la lista (Performance → Timings).
4. Repetir 5 veces y registrar el peor tiempo.

## NFR2 — cuadrícula (pendiente, requiere la app)

1. Preparar 1 000 productos activos, 500 con imagen de hasta 5 MB (copiadas por el flujo normal de la pantalla de productos).
2. Activar la cuadrícula y medir desde el clic hasta que las primeras tarjetas son visibles (≤2 s).
3. Escribir un filtro y cambiar el orden; medir hasta que la vista se actualiza (≤500 ms cada uno).
4. En la pestaña de red de la WebView comprobar que las imágenes se piden por URL del protocolo de assets y no como `data:`, y que solo se piden las de las tarjetas cercanas a la vista (`loading="lazy"`).
5. Si el primer punto no se cumple, contingencia ya prevista: `content-visibility: auto` por grupo.

## Sources

- `inception/requirements-analysis/requirements.md` (NFR1, NFR2).
- Medición temporal de esta etapa (compilación de depuración, 5 000 productos).
- `src/modules/pos/utils/productSuggestions.ts` (200 ms) y `productGrid.ts` (100 ms).

## Assumptions & Open Questions

- [assumption] El plazo de 300 ms cuenta desde que el cajero deja de escribir e incluye la espera de 200 ms. Si la intención era contarlo desde que se envía la petición, el margen es amplio.
- [assumption] Ninguna etapa posterior del plan actual (`refactor`) valida rendimiento; la medición de punta a punta no tiene dueño posterior.
