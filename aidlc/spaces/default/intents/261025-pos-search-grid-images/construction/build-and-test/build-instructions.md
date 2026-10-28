# Instrucciones de compilación

## Requisitos previos

- Node.js con `npm` y Rust estable con `cargo` (el proyecto es Tauri 2 + React 19 + MUI 7 + TypeScript).
- Dependencias del frontend: `npm install`. Dependencias de Rust: se descargan solas con `cargo` (incluye `deunicode`, agregado en U2).
- No hay variables de entorno ni servicios locales que preparar. La base SQLite de pruebas es en memoria.

## Comandos

```bash
# Rust: compilar y correr toda la suite
cargo test --manifest-path src-tauri/Cargo.toml

# Rust: solo verificar tipos
cargo check --manifest-path src-tauri/Cargo.toml

# Frontend: suite completa (Vitest, entorno node)
npx vitest run

# Frontend: verificación de tipos
npx tsc --noEmit --ignoreDeprecations 5.0
```

El comando de verificación de Construcción registrado por la persona es `cargo test --manifest-path src-tauri/Cargo.toml && npx vitest run`.

## Verificación de la compilación

- `cargo test` termina con `test result: ok` y 0 fallas.
- `npx vitest run` termina con todos los archivos en verde.
- `tsc` termina con código de salida 0.

## Problemas conocidos

- `npm run build` falla antes de este cambio por la opción `TS5103` en `tsconfig.json` (preexistente, no se tocó). Se usa `npx tsc --noEmit --ignoreDeprecations 5.0` como comprobación de tipos.
- En Windows, el comando `aidlc engine log ...` falla desde Bash; usar PowerShell.

## Sources

- `AGENTS.md` (sección Commands) y `construction/*/code-generation/unit-test-instructions.md`.
- Aprobación de la persona del comando de verificación (`verification-command.txt`).

## Assumptions & Open Questions

- [assumption] `npm run build` seguirá fallando por TS5103 hasta que alguien corrija `tsconfig.json`; está fuera del alcance de esta mejora.
