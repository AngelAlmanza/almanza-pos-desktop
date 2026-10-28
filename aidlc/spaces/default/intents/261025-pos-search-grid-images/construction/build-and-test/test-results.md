# Resultados de pruebas — Build and Test

Fecha de ejecución: 2026-10-27, Windows 11, compilación de depuración.

## Compilación y verificación de tipos

| Comando | Resultado |
|---|---|
| `cargo test --manifest-path src-tauri/Cargo.toml` (compila) | Éxito |
| `npx tsc --noEmit --ignoreDeprecations 5.0` | Éxito, código de salida 0 |
| `npm run build` | No se ejecuta: falla por `TS5103` preexistente en `tsconfig.json` (ver `build-instructions.md`) |

## Pruebas

| Suite | Total | Pasaron | Fallaron | Omitidas |
|---|---|---|---|---|
| Rust (`cargo test`, binario principal) | 135 | 135 | 0 | 0 |
| Rust (otros binarios y doctests) | 0 | 0 | 0 | 0 |
| Frontend (`npx vitest run`) | 212 | 212 | 0 | 0 |

Los comandos acotados por unidad de `unit-test-instructions.md` son subconjuntos de estas dos suites; se corrió cada suite una sola vez para no contar dos veces. Detalle del frontend: 12 archivos, entre ellos `productGrid` (24), `viewMode` (10), `productSuggestions` (23), `productImageField` (14), `productImage` (7) y `posReducer` (23, regresión del carrito).

Fallas: ninguna. Cobertura: no se midió (`refactor` no agrega mínimo y el proyecto no tiene reporte de cobertura configurado en este flujo); no se bajó ningún umbral.

## Medición de rendimiento (NFR1, parte del backend)

Prueba temporal, retirada después de medir; el archivo `sqlite.rs` quedó con el mismo hash que antes. 5 000 productos activos, compilación de depuración, `find_active` + `rank` con límite 10, mejor de 5 corridas: `jam` 69 ms, `nand` 64 ms, `7500000` 70 ms, `zzz` 38 ms. Ver `performance-test-instructions.md`.

## Target Verification Matrix (resultado final)

Ver `build-and-test-summary.md`.

## Elementos sin ejecutar

- Medición de punta a punta de NFR1 y NFR2 en la app real.
- Verificaciones manuales M1–M11 (`integration-test-instructions.md`), incluido el lector de código de barras (NFR3).

Ninguna etapa posterior del plan actual los valida.

## Sources

- Salida de `cargo test`, `npx vitest run` y `npx tsc` ejecutados en esta etapa.

## Assumptions & Open Questions

- [assumption] La compilación de depuración es el peor caso de rendimiento de Rust; una compilación de producción sería más rápida.
