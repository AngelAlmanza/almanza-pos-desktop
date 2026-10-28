# Resumen de Build and Test

## Estado general

- Compilación: éxito (`cargo test` compila, `tsc` sin errores). `npm run build` no se usa por el error preexistente `TS5103`.
- Pruebas automáticas: 135 de Rust y 212 de Vitest, todas en verde.
- Resultado de la etapa: **no exitoso**, porque seis objetivos medibles quedaron `Unverified` y la trazabilidad cruzada tiene hallazgos. Ningún comando falló.

## Inventario de tipos de prueba

Estrategia Standard. Se generaron: instrucciones de compilación, de integración, de rendimiento y de seguridad (estas dos últimas porque existen NFR1, NFR2 y NFR4), resultados y trazabilidad cruzada.

## Cobertura esperada por unidad

| Unidad | Pruebas nuevas | Resultado |
|---|---|---|
| U1 product-image | Rust (reglas, almacenamiento, casos de uso, repositorio, migración) y 21 de Vitest | En verde |
| U2 search-suggestions | 18 de Rust (coincidencia 10, caso de uso 6, comando 2) y 23 de Vitest | En verde |
| U3 pos-grid-view | 34 de Vitest | En verde |

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-NFR1 | requirements.md NFR1 | Sugerencias ≤300 ms con 5 000 productos, desde que se deja de escribir | Backend 38–70 ms (depuración) más 200 ms de espera = hasta 270 ms antes de IPC y pintado; sin medir de punta a punta | `performance-test-instructions.md`, `test-results.md` | Ninguna posterior | Unverified |
| T-NFR2a | requirements.md NFR2 | Primeras tarjetas ≤2 s con 1 000 productos y 500 imágenes | No medido | `performance-test-instructions.md` | Ninguna posterior | Unverified |
| T-NFR2b | requirements.md NFR2 | Filtrar u ordenar ≤500 ms | No medido (espera de filtro 100 ms; el orden es local) | `performance-test-instructions.md` | Ninguna posterior | Unverified |
| T-NFR2c | requirements.md NFR2 | Sin base64 masivo en memoria | Imágenes por URL del protocolo de assets con `loading="lazy"` (revisión de código); sin comprobar en la app | `code-summary.md` de U3, `performance-test-instructions.md` | Ninguna posterior | Unverified |
| T-NFR3 | requirements.md NFR3 | Escaneo agrega el producto en un solo paso en ambas vistas | Lógica de Enter probada (`decideEnter`, 4 pruebas); sin lector real | `integration-test-instructions.md` M3 y M6 | Ninguna posterior | Unverified |
| T-NFR4 | requirements.md NFR4 | Confinamiento de archivos de imagen | 8 pruebas de reglas y 7 de almacenamiento en verde | `test-results.md`, `security-test-instructions.md` | — | Met |
| T-NFR5 | requirements.md NFR5 | Migración conserva el 100 % de los productos; montos con helpers | 5 pruebas de migración y modelo en verde; `decimal.js` sin cambios | `test-results.md` | — | Met |
| T-NFR6 | requirements.md NFR6 | Teclado y texto "Agotado" | Texto "Agotado" y "Stock insuficiente" en código; teclado sin probar en la app | `integration-test-instructions.md` M7 y M8 | Ninguna posterior | Unverified |
| T-NFR7 | requirements.md NFR7 | Suites existentes en verde y pruebas nuevas | 135 y 212 pruebas en verde | `test-results.md` | — | Met |
| T-COV | org.md (refactor) | Sin piso de cobertura nuevo; suite existente en verde | Suite en verde | `test-results.md` | — | Met |

## Preparación

- Build-ready: sí.
- Test-ready: sí para lógica pura; la verificación con la app corriendo requiere a la persona.
- Deployment-ready: no declarado (la fase del producto es prueba de concepto, sin despliegue).

## Limitaciones y pendientes

- Seis objetivos `Unverified` (T-NFR1, T-NFR2a, T-NFR2b, T-NFR2c, T-NFR3, T-NFR6) necesitan la app corriendo; ninguna etapa posterior los tiene a su cargo.
- Riesgo de margen en NFR1: 200 ms de espera más hasta 70 ms de backend en depuración.
- Trazabilidad cruzada: NFR1, NFR3, NFR6 y NFR7 sin entrada propia; FR cubiertos por unidad. Ver `cross-unit-traceability.md`.
- No hay pruebas de componentes (sin DOM); lo señalaron las revisiones de U2 y U3.

## Sources

- `test-results.md`, `performance-test-instructions.md`, `security-test-instructions.md`, `integration-test-instructions.md`, `cross-unit-traceability.md`.
- `inception/requirements-analysis/requirements.md`.

## Assumptions & Open Questions

- [assumption] Un objetivo que solo se puede medir con la app y un lector real queda `Unverified` si nadie lo mide, aunque el código lo permita.
