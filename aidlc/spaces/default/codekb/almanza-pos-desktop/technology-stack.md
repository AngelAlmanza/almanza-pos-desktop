# Stack tecnológico — Almanza POS Desktop

Versiones resueltas tomadas de `package-lock.json` y `src-tauri/Cargo.lock` (rango declarado entre paréntesis cuando difiere).

## Lenguajes

| Lenguaje | Versión / edición | Uso |
|---|---|---|
| Rust | edición 2021 (sin `rust-version` fijado) | Núcleo de escritorio, reglas de negocio, SQLite, impresión |
| TypeScript | 5.8.3 (`~5.8.3`), `strict`, target ES2020, `moduleResolution: bundler` | SPA |
| SQL (SQLite) | SQLite embebido vía `rusqlite` `bundled` | Esquema y migraciones |
| HTML/CSS-in-JS | Emotion vía MUI `sx` | Estilos |

## Runtime y plataforma

| Componente | Versión | Notas |
|---|---|---|
| Tauri (crate) | 2.10.2 (`2`) | Ventana única 1280×800 (mín. 1024×600), maximizada, título "Almanza POS"; identificador `com.angel-almanza.almanza-pos-desktop` |
| `@tauri-apps/api` | 2.10.1 (`^2`) | `invoke`, `path` |
| `@tauri-apps/cli` | 2.10.0 (`^2`) | `tauri dev/build` |
| tauri-build | 2 | `build.rs` |
| Plataforma objetivo | Windows (principal); bundle `targets: all` | Código con `cfg(target_os = "windows")` para el spooler; detección con PowerShell |
| WebView | WebView2 en Windows | `security.csp: null`; protocolo de assets no configurado |

## Plugins Tauri

| Plugin | Crate | npm | Permisos (`capabilities/default.json`) |
|---|---|---|---|
| dialog | `tauri-plugin-dialog` 2.6.0 | `@tauri-apps/plugin-dialog` 2.6.0 | `dialog:default` |
| fs | `tauri-plugin-fs` 2.4.5 | `@tauri-apps/plugin-fs` 2.4.5 | `fs:default` + `fs:allow-write-file` en `$DOWNLOAD/**` y `$HOME/**` |
| opener | `tauri-plugin-opener` 2 | `@tauri-apps/plugin-opener` 2.5.3 | `opener:default` + `opener:allow-open-path` en `$DOWNLOAD/**` y `$HOME/**` |

## Backend (crates)

| Crate | Versión | Propósito |
|---|---|---|
| rusqlite | 0.31.0 (feature `bundled`) | Acceso a SQLite |
| serde / serde_json | 1.0.228 / 1 | Serialización IPC y parseo JSON (impresoras Windows) |
| bcrypt | 0.15 | Hash de contraseñas |
| uuid | 1 (`v4`) | Token de login |
| tokio | 1.49.0 (`net`, `rt`, `sync`, `time`) | Runtime async de impresión |
| async-trait | 0.1 | Traits async (`PrinterPort`, `PrinterAdapter`, `PrinterConnection`) |
| serialport | 4.5 | Impresoras USB por puerto COM |
| deunicode | 1.6 | Texto ASCII para tickets |
| windows | 0.61 (`Win32_Foundation`, `Win32_Graphics_Printing`) | Envío RAW al spooler |

## Frontend (npm)

| Paquete | Versión | Propósito |
|---|---|---|
| react / react-dom | 19.2.4 (`^17 \|\| ^18 \|\| ^19`) | UI |
| @mui/material | 7.3.8 | Componentes |
| @mui/icons-material | 7.3.7 | Iconos |
| @mui/x-date-pickers | 8.27.0 | Selectores de fecha (adaptador Moment) |
| @emotion/react / styled | 11.14.0 / 11.14.1 | Motor de estilos de MUI |
| react-router-dom | 7.13.0 | Rutas (`BrowserRouter`) |
| decimal.js | 10.6.0 | Aritmética de dinero y cantidades |
| exceljs | 4.4.0 | Exportación Excel |
| jspdf / jspdf-autotable | 4.2.0 / 5.0.7 | Exportación PDF |
| moment | 2.30.1 | Fechas (locale `es`) |
| date-fns | 4.1.0 | Declarado; uso marginal frente a moment |

## Herramientas de build y prueba

| Herramienta | Versión | Configuración |
|---|---|---|
| Vite | 7.3.1 | `vite.config.ts`: puerto fijo 1420, alias `@core`/`@modules`, ignora `src-tauri` |
| @vitejs/plugin-react | ^4.6.0 | |
| Vitest | 4.0.18 | `vitest.config.ts`: entorno `node`, mismos alias |
| @vitest/coverage-v8 | ^4.0.18 | `npm run test:coverage` |
| tsc | 5.8.3 | `npm run build` = `tsc && vite build`; excluye `*.test.ts(x)` |
| cargo test / cargo check | toolchain estable | Pruebas en línea |
| @types/node / react / react-dom / jspdf | ^26.1.1 / ^19.1.8 / ^19.1.6 / ^1.3.3 | Tipos |

No hay ESLint, Prettier, rustfmt/clippy configurados ni CI (ver `code-quality-assessment.md`).

## Almacenamiento

| Dato | Ubicación |
|---|---|
| Base de datos | `<app_data_dir>/pos.db` (WAL, `foreign_keys=ON`) |
| Imágenes (logotipo) | `<app_data_dir>/resources/<key>.<ext>` (ruta absoluta en `settings.value`) |
| Sesión de login | `localStorage['pos_session']` del WebView |
| Exportaciones | Ruta elegida por el usuario (por defecto carpeta de Descargas) |

En Windows, `app_data_dir` corresponde a `%APPDATA%\com.angel-almanza.almanza-pos-desktop\`.
