# Trazabilidad cruzada entre unidades

**Veredicto: FALLA (con hallazgos).** Todos los criterios de aceptación (AC) de las tres unidades están cubiertos con estado `OK` y sus archivos existen. Los requisitos funcionales (FR) están cubiertos a nivel de unidad, no de ID. Cuatro requisitos no funcionales (NFR1, NFR3, NFR6, NFR7) no tienen una entrada propia en ningún `traceability.json` de code generation.

El flujo no ejecutó la etapa de historias de usuario, así que no hay AC de tres segmentos que enumerar; los AC de dos segmentos (`AC1.x` a `AC4.x`) pertenecen a los diseños funcionales de cada unidad.

## Cobertura por unidad (AC)

| Unidad | Archivo | AC cubiertos | Estados no `OK` | Archivos de destino faltantes |
|---|---|---|---|---|
| U1 product-image | `construction/product-image/code-generation/traceability.json` | AC4.1–AC4.9, NFR2, NFR4, NFR5, BR1.1–BR5.2 (29 entradas) | 0 | 0 |
| U2 search-suggestions | `construction/search-suggestions/code-generation/traceability.json` | AC1.1–AC1.10 (10 entradas) | 0 | 0 |
| U3 pos-grid-view | `construction/pos-grid-view/code-generation/traceability.json` | AC2.1–AC2.9, AC3.1–AC3.4 (13 entradas) | 0 | 0 |

## Requisitos funcionales

La asignación de cada FR a una unidad sale de `inception/units-generation/traceability.json` (FR1 y FR1.1–FR1.12 → U2; FR2, FR3 → U3; FR4 y FR4.1–FR4.14 → U1; las tres unidades tienen sus AC en `OK`). Ninguna entrada de code generation nombra los FR por ID, por lo que la cobertura FR es indirecta.

| Grupo | IDs | Unidad dueña | Verdict |
|---|---|---|---|
| FR1 | FR1.1–FR1.12 | U2 | Cubierto vía AC1.1–AC1.10 (indirecto) |
| FR2 | FR2.1–FR2.12 | U3 | Cubierto vía AC2.1–AC2.9 (indirecto) |
| FR3 | FR3.1–FR3.5 | U3 | Cubierto vía AC3.1–AC3.4 (indirecto) |
| FR4 | FR4.1–FR4.14 | U1 | Cubierto vía AC4.1–AC4.9 (indirecto) |

## Requisitos no funcionales

| ID | Unidad dueña | Entrada directa `OK` en code generation | Archivo de destino | Verdict |
|---|---|---|---|---|
| NFR1 | U2 | No | — | Hallazgo: sin entrada; medición de punta a punta pendiente |
| NFR2 | U1 / U3 | Sí, solo en U1 | `src-tauri/tauri.conf.json` | Parcial: U3 no lo lista; medición pendiente |
| NFR3 | U2 / U3 | No | — | Hallazgo: sin entrada; verificación con lector pendiente |
| NFR4 | U1 | Sí | `src-tauri/src/modules/catalog/products/image.rs` | Cubierto |
| NFR5 | U1 | Sí | `src-tauri/src/infrastructure/sqlite/migrations/0007_products_image_file.sql` | Cubierto |
| NFR6 | Todas | No | — | Hallazgo: sin entrada; verificación de teclado a mano pendiente |
| NFR7 | Todas | No | — | Hallazgo: sin entrada; evidencia en `test-results.md` (135 + 212 pruebas en verde) |

## Hallazgos para el gate

1. NFR1, NFR3, NFR6 y NFR7 no figuran en ningún `traceability.json` de code generation. Las unidades asignaron estos requisitos a nivel de diseño, pero la entrada se escribió solo con los AC.
2. NFR2 solo aparece en U1; U3 es la unidad dueña de la cuadrícula.
3. Los FR se cubren por unidad y no por ID.

## Sources

- `inception/requirements-analysis/requirements.md`.
- `inception/units-generation/traceability.json` y `unit-of-work-story-map.md`.
- `construction/*/code-generation/traceability.json`.

## Assumptions & Open Questions

- [assumption] La cobertura de FR vía AC es indirecta; el motor de trazabilidad no exige IDs FR en code generation. Si el equipo quiere cobertura directa, las entradas de code generation deben nombrar los FR.
