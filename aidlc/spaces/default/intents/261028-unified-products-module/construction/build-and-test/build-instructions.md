# Instrucciones de compilación — Módulo de Productos unificado

## Requisitos previos

- Node.js con npm y las dependencias instaladas (`npm install`). No se agregó ninguna dependencia nueva.
- Rust estable con `cargo` para el backend de Tauri (solo para `cargo test` y la app completa).
- Sin variables de entorno ni servicios locales: SQLite va incluido (`rusqlite` con `bundled`).

## Comandos

| Paso | Comando | Resultado esperado |
|------|---------|--------------------|
| Instalar dependencias | `npm install` | Sin errores |
| Revisar tipos | `npx tsc --noEmit` | Sin errores de tipos |
| Compilar la interfaz | `npx vite build` | `built in …`, carpeta `dist/` |
| Compilación completa del script | `npm run build` (`tsc && vite build`) | Ver "Problema conocido" |
| Pruebas del frontend | `npm test` | Todas en verde |
| Pruebas del backend | `cd src-tauri && cargo test` | Todas en verde |
| App completa | `npm run tauri dev` | La ventana abre en Productos |

## Verificación de la compilación

1. `tsc` termina sin errores y `vite build` genera `dist/index.html` y los archivos de `dist/assets/`.
2. El aviso de Vite sobre fragmentos mayores de 500 kB ya existía (un solo paquete de 2,4 MB) y no es parte de este cambio.

## Problema encontrado y corregido en esta etapa

`npm run build` fallaba antes de compilar con `tsconfig.json(3,27): error TS5103: Invalid value for '--ignoreDeprecations'`. El `tsconfig.json` trae `"ignoreDeprecations": "6.0"`, pero `package.json` fija TypeScript en `~5.8.3`, que no acepta ese valor. El fallo ya existía antes de este cambio.

Corrección aplicada (configuración de compilación, un intento): se quitó la línea `"ignoreDeprecations": "6.0"` de `tsconfig.json`. Con TypeScript 5.8 esa opción no hace falta (`baseUrl` no está en desuso). Después, `npm run build` termina bien. Si se sube TypeScript a 6, hay que volver a poner la línea.

## Solución de problemas

- **Alias `@core` o `@modules` no resuelven:** revisar `vite.config.ts` y `vitest.config.ts` (ambos los declaran).
- **`cargo test` tarda la primera vez:** compila SQLite y las dependencias; las siguientes corridas son rápidas.
