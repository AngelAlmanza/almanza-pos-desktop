# Instrucciones de pruebas de integración

## Alcance

La estrategia es Standard: se cubren las fronteras clave entre unidades. No hay entorno de DOM ni de Tauri en las pruebas automáticas, así que la frontera frontend-backend se prueba de dos formas: contrato del comando en Rust (serialización) y pruebas de lógica pura en el frontend. Lo que cruza la ventana real se verifica a mano (ver "Verificación manual").

## Pruebas automáticas de frontera

```bash
# U1 ↔ U2/U3: el producto con image_file llega a las ventas y a la búsqueda
cargo test --manifest-path src-tauri/Cargo.toml modules::sales
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products

# Migración 0007 sobre productos existentes (NFR5)
cargo test --manifest-path src-tauri/Cargo.toml infrastructure::sqlite::migrations

# Frontera del comando suggest_products (límite opcional en el IPC)
cargo test --manifest-path src-tauri/Cargo.toml modules::catalog::products::adapters::inbound

# Regresión del carrito, que usan sugerencias y cuadrícula (NFR3, NFR5)
npx vitest run src/__tests__/modules/pos
```

## Verificación manual con la app (`npm run tauri dev`)

| ID | Qué se comprueba | Resultado esperado | Unidad |
|---|---|---|---|
| M1 | Escribir 3 caracteres con acento omitido (`jamon`) | Sugerencias de `Jamón`, 3 filas visibles con scroll | U2 |
| M2 | Enter con y sin fila resaltada | Con fila: agrega esa; sin fila: flujo y modal actuales | U2 |
| M3 | Escanear código existente con la lista abierta (NFR3) | Se agrega en un solo paso, una sola vez | U2 |
| M4 | Producto agotado y producto a granel desde la lista | Aviso de stock y diálogo de granel, igual que antes | U2 |
| M5 | Cambiar a cuadrícula, ir a otra ruta y volver | Se conserva la vista; al cerrar sesión (incluida sesión caducada) vuelve a lista | U3 |
| M6 | Escanear justo después de tocar una tarjeta (NFR3) | Se agrega solo el producto escaneado, una vez | U3 |
| M7 | Tarjeta agotada | Texto "Stock insuficiente. Disponible: 0" y chip "Agotado" | U3 |
| M8 | Teclado sobre tarjetas (NFR6) | Enfocables; Enter y Espacio agregan | U3 |
| M9 | Carrito compacto | Muestra cantidad × precio base | U3 |
| M10 | Recarga de stock tras una venta | La tarjeta refleja el stock nuevo | U3 |
| M11 | Imagen en tarjeta con carga diferida | Placeholder y luego la imagen, sin congelar el desplazamiento | U1/U3 |

## Datos de prueba

Para NFR1 y NFR2 hace falta una base con 5 000 productos activos y, para NFR2, 1 000 productos con 500 imágenes de hasta 5 MB. El procedimiento está en `performance-test-instructions.md`.

## Sources

- `construction/*/code-generation/unit-test-instructions.md` (secciones de verificación manual).
- `inception/requirements-analysis/requirements.md` (NFR3, NFR5, NFR6).

## Assumptions & Open Questions

- [assumption] Los puntos M1–M11 los ejecuta la persona con la app corriendo; no hay herramienta de DOM disponible para automatizarlos (riesgo R-04 de las revisiones de U2 y U3).
