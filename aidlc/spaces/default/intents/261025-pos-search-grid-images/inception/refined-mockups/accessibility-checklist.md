# Checklist de accesibilidad — WCAG 2.1 AA

Alcance: lista de sugerencias, selector de vista, cuadrícula, tarjetas, carrito compacto y campo de imagen del producto (`mockups.md`, `interaction-spec.md`). Es un POS de escritorio usado sobre todo con teclado y lector de código de barras, así que el teclado es prioritario (NFR3, NFR6).

## Perceptible

| Criterio | Aplicación | Verificación |
|---|---|---|
| 1.1.1 Contenido no textual | La imagen de la tarjeta es decorativa (`alt=""`) porque el nombre está en la etiqueta accesible de la tarjeta. La vista previa del formulario usa `alt="Imagen de <producto>"` o "Sin imagen". Los iconos de botones sin texto tienen `aria-label` | Revisión de código y lector de pantalla (NVDA) |
| 1.3.1 Información y relaciones | Grupos de categoría como `section` con encabezado; tarjetas en lista; sugerencias como `listbox` con `option` | Inspección del árbol de accesibilidad |
| 1.4.1 Uso del color | "Agotado" siempre con texto (chip y stock) además de la atenuación. El resaltado de la sugerencia tiene fondo y además `aria-selected`; el foco tiene contorno | Simulación de daltonismo |
| 1.4.3 Contraste (mínimo) | Texto principal `#1a2035` y secundario `#5a6380` sobre blanco y sobre `#faf9f6` ≥ 4.5:1. Precio `#0d6b5f` sobre blanco ≥ 4.5:1. El texto de una tarjeta agotada (opacidad 0.55) es contenido inactivo y queda exento (1.4.3), pero el chip "Agotado" mantiene contraste completo | Verificador de contraste |
| 1.4.11 Contraste no textual | Borde de foco de 2 px `primary.main` (≥ 3:1); estado seleccionado del selector de vista ≥ 3:1 | Verificador de contraste |
| 1.4.4 / 1.4.10 Redimensionar y reflujo | A 200 % de zoom la cuadrícula reduce columnas (auto-fill) sin scroll horizontal y el formulario pasa a una columna (< 900 px) | Zoom de la WebView al 200 % |

## Operable

| Criterio | Aplicación | Verificación |
|---|---|---|
| 2.1.1 Teclado | Sugerencias con ↑/↓/Enter/Esc/Tab; tarjetas con Tab y Enter/Espacio; selector de vista, orden, carrito y campo de imagen con controles nativos | Recorrido completo sin mouse |
| 2.1.2 Sin trampas de teclado | La lista de sugerencias se cierra con Esc y con Tab. En la cuadrícula, Esc devuelve el foco a la barra. Los diálogos mantienen su foco atrapado y se cierran con Esc (comportamiento de MUI) | Recorrido con teclado |
| 2.4.3 Orden del foco | Barra → selector de vista → (cuadrícula: orden → tarjetas en orden de lectura) → carrito → Cobrar | Recorrido con Tab |
| 2.4.7 Foco visible | Contorno de 2 px con offset en tarjetas; foco de MUI en el resto; la sugerencia resaltada tiene fondo visible | Inspección visual |
| 2.5.5 Tamaño del objetivo (AAA, referencia) | Tarjetas de al menos 176×236 px; botones −/+ del carrito de al menos 32 px (actuales); filas de sugerencia de 56 px | Medición |
| 2.3.3 / movimiento | Resaltado de la partida (600 ms) sin animación si el sistema pide `prefers-reduced-motion` | Ajuste del sistema operativo |

## Comprensible

| Criterio | Aplicación | Verificación |
|---|---|---|
| 3.2.1 / 3.2.2 Sin cambios de contexto inesperados | Escribir no agrega productos; solo Enter, clic o Espacio lo hacen. Cambiar de vista no altera el carrito | Pruebas de comportamiento |
| 3.3.1 Identificación de errores | Errores de imagen con texto concreto (formato, tamaño, dañado, permiso) bajo los botones y con icono; error de stock con el mensaje actual | Pruebas de AC4.2, AC4.3 y AC1.8 |
| 3.3.2 Etiquetas o instrucciones | "Imagen (opcional)" y la ayuda "PNG, JPG o WebP. Máximo 5 MB." visibles antes de elegir | Revisión visual |
| 3.3.4 Prevención de errores | Quitar imagen es reversible hasta Guardar ("Deshacer"); eliminar un producto mantiene la confirmación actual | Pruebas de AC4.4 y AC4.6 |

## Robusto

| Criterio | Aplicación | Verificación |
|---|---|---|
| 4.1.2 Nombre, función, valor | Combobox con `aria-expanded`, `aria-controls` y `aria-activedescendant`; toggle con `aria-pressed`; tarjeta agotada con `aria-disabled` | Árbol de accesibilidad |
| 4.1.3 Mensajes de estado | `aria-live="polite"` para "N sugerencias", "Sin coincidencias", "N productos" y los avisos del campo de imagen | NVDA |

## Pruebas manuales mínimas antes de aprobar Build and Test

- [ ] Vender 3 productos solo con teclado en vista de lista (sugerencias + Enter) y en vista de cuadrícula (Tab + Enter).
- [ ] Escanear un código con la lista de sugerencias visible: se agrega el producto escaneado, no la sugerencia.
- [ ] Verificar "Agotado" con la simulación de escala de grises.
- [ ] Asignar, cambiar y quitar una imagen solo con teclado.
- [ ] Zoom al 200 %: sin scroll horizontal en el POS ni en el diálogo de producto.

## Sources

- `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`.
- `requirements.md` NFR3 y NFR6, y FR1.5, FR2.9, FR4.4.
- `mockups.md` e `interaction-spec.md` de esta etapa.
- `docs/interface-design/system.md` (colores para el contraste).

## Assumptions & Open Questions

- [assumption] El nivel objetivo es WCAG 2.1 AA, el estándar del rol de diseño. Los requisitos solo piden accesibilidad básica (NFR6), así que el AA se toma como guía y no como criterio formal de aceptación para esta prueba de concepto.
- [assumption] Las relaciones de contraste citadas se calculan con la paleta de `system.md`; se confirman con un verificador durante Build and Test.
