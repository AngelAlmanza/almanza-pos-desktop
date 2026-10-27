## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-26T20:54:10Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/search-suggestions/functional-design/functional-spec.md > W3 (pasos 1-2) y frontend-components.md > PosSearchBar > Comportamiento, punto 3 (Selección) | Al elegir una sugerencia la lista sigue abierta y resaltada durante el `await` de `getById`. Solo el `onSubmit` de Enter cierra e invalida de forma síncrona. Un doble clic en una fila, o dos Enter seguidos con la fila resaltada, dispara dos relecturas y puede agregar el producto dos veces, o abrir dos veces el diálogo a granel. | Definir que la selección (clic o Enter) también llama a `closeAndInvalidate()` de forma síncrona antes de la relectura, o que hay una guarda de selección en curso que ignora una segunda selección. Añadir un caso a la regresión de Enter prevista. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/search-suggestions/functional-design/functional-spec.md > Contrato del backend > Normalización | `deunicode` devuelve el marcador `[?]` para caracteres sin equivalente, y puede expandir un carácter a varios (por ejemplo `æ` a `ae`). Con ese texto, o con símbolos poco comunes en un nombre, la coincidencia se comportaría de forma imprevista. La especificación solo afirma que es "irrelevante" para un catálogo en español. | Indicar qué pasa con `[?]` (descartarlo en ambos lados o aceptar el comportamiento) y añadir un caso de prueba Rust con un carácter sin equivalente. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/search-suggestions/functional-design/functional-spec.md > W7 paso 2 y frontend-components.md > useProductSuggestions | "No se repite el mensaje mientras siga visible" exige que `PosSearchBar` sepa si el error del POS está visible, pero `usePos` solo se describe con `setError` y no hay un mecanismo definido (estado local o lectura del contexto). El patrón actual `setTimeout(() => setError(''), 3000)` tampoco se cancela, así que un temporizador viejo puede borrar un mensaje más reciente. | Fijar el mecanismo para conocer la visibilidad (por ejemplo, un `ref` con el último mensaje y su hora de expiración) y decidir si el temporizador se cancela al mostrar un mensaje nuevo. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261025-pos-search-grid-images/construction/search-suggestions/functional-design/frontend-components.md > PosSearchBar > Comportamiento, puntos 3 y 4 | Si el cajero sigue escribiendo mientras corre la relectura de `getById`, al agregar el producto se limpia `barcodeInput` y se pierde el texto nuevo. Además, `ClickAwayListener` no indica qué envuelve: si no incluye tanto el campo como el `Popper`, que va en un portal, un clic en una fila contaría como clic fuera. | Aclarar que la limpieza solo aplica si el texto no cambió desde la selección (o aceptar la pérdida), y especificar que el `ClickAwayListener` cubre el campo y el contenedor `listbox`. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| (ninguna listada en la etapa) | n/a | Se verificó contra el código: `deunicode = "1.6"` está en `Cargo.toml` y se usa en `printer/utils.rs`; existen `find_active`, `get_product` y `ProductService.getById`; `Product` tiene `active` e `image_file`; el flujo `handleBarcodeSubmit` limpia `barcodeInput` en `finally`, tal como describe la especificación. |

### Summary

El diseño es implementable: el contrato `suggest_products`, la máquina de estados, el cierre síncrono en Enter, la descarta de respuestas viejas, la ausencia de reconsulta tras "Producto no encontrado", las notas para U3 y la normalización con `deunicode` están resueltos y coinciden con el código actual. Lo único que conviene decidir antes de aprobar es la protección contra selección doble durante la relectura de W3; los demás puntos son menores.
