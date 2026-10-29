## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-29T15:58:49Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261028-unified-products-module/construction/code-generation/unit-test-instructions.md > línea 6 (verificación de componentes) | Las 249 pruebas cubren solo funciones puras (entorno node). Lo que da más riesgo queda sin prueba automática: ocultar (no deshabilitar) acciones al cajero en ProductTable y ProductsPage, el panel lateral, el rebote de las rutas antiguas en App.tsx y el flujo de errores. El documento dice que esos componentes se verifican con `npm run build` y revisión manual, pero `npm run build` no corre (TS5103) y no hay evidencia de revisión manual. Yo comprobé los tipos con un tsconfig temporal sin `ignoreDeprecations` y `tsc --noEmit` pasó limpio. | Antes de aprobar, hacer un recorrido manual como admin y como cajero y anotarlo en code-summary.md: cajero ve solo lista, filtros, resumen y "Ajustar stock"; `/inventory` y `/categories` redirigen; el ajuste actualiza resumen y panel. Opcional: agregar jsdom y una prueba de render de ProductTable con `permissions` de cajero. | New |
| R-02 | Minor | src/modules/catalog/products/components/ProductFormDialog.tsx > handleSave (rama `editing`) | Al editar, elegir "Sin categoría" envía `category_id: undefined`. El backend (products/adapters/outbound/sqlite.rs, `if category_id.is_some()`) lo ignora, así que no se puede quitar la categoría y la interfaz parece aceptarlo. Pasa igual con descripción y código de barras vacíos. Ya era así en la pantalla anterior, pero el nuevo formulario lo ofrece de forma explícita. | Documentar la limitación en code-summary.md, o quitar la opción "Sin categoría" al editar. Si se quiere soportarlo, haría falta un cambio en backend, fuera de este alcance. | New |
| R-03 | Minor | src/modules/catalog/products/components/ProductSidePanel.tsx > validación y vista previa del ajuste negativo | `validateAdjustmentQuantity` no compara contra el stock actual. Un ajuste "Faltó al contar" mayor al stock muestra una vista previa con stock negativo y deja confirmar. El backend lo rechaza con "Stock insuficiente para el ajuste negativo" y el mensaje sí se muestra (no hay captura silenciosa), pero se pierde la oportunidad de avisar antes. | Bloquear en cliente cuando `type === 'negative'` y la cantidad supera `current.stock`, con mensaje claro. Agregar el caso a stockAdjustment.test.ts. | New |
| R-04 | Minor | src/modules/catalog/products/pages/ProductsPage.tsx > handleToggleActive, handleConfirmDeleteProduct, handleProductSaved | Cada activar/desactivar, eliminar o guardar llama a `loadData()`, que pone `loading=true`. La tabla pasa a esqueleto y las tarjetas de resumen desaparecen (`summary` es null) tras cada acción, con parpadeo y pérdida de contexto visual. Los filtros se conservan. | Recargar sin volver a mostrar esqueleto (refresco silencioso), o actualizar el producto en memoria como ya hace `handleAdjusted`. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261028-unified-products-module/construction/code-generation/traceability.json > FR1, FR9, NFR2, NFR6 | Cuatro filas apuntan a un destino que no es la implementación completa. FR9 y NFR6 apuntan a archivos de prueba. FR1 apunta solo a navItems.ts, y las reglas de permisos y las rutas antiguas están en App.tsx, productPermissions.ts y ProductsPage.tsx. NFR2 apunta a la página entera. Revisé el código: lo declarado sí está implementado, así que es un problema de trazabilidad, no de funcionalidad. | Apuntar FR9 a stockStatus.ts (`filterProducts`), FR1 a navItems.ts y App.tsx, NFR6 a navItems.ts, y precisar NFR2. | New |
| R-06 | Minor | src/modules/catalog/products/components/ProductTable.tsx > encabezado de columna status; src/modules/catalog/products/utils/columnVisibility.ts > PRODUCT_COLUMNS status | La etiqueta "Estado de stock" solo existe en el filtro de ProductsPage.tsx (línea 256). El encabezado de la tabla y la opción del menú de columnas siguen diciendo "Estado". Si el feedback pedía renombrar la columna, no está cubierto. | Confirmar con la persona si el renombre aplica también a la columna. Si aplica, cambiar el texto en ProductTable.tsx y columnVisibility.ts. | New |
| R-07 | Minor | src/modules/catalog/products/components/CategorySidebar.tsx > nombre de categoría | El nombre se recorta dos veces: con truncateText a 24 caracteres y con noWrap (una sola línea). Esto no es el clamp de 2 líneas que se aplicó a nombre y descripción en la tabla. Con el sidebar de 200 px, el nombre puede cortarse por CSS antes de los 24 caracteres, y el "…" lo dibuja el navegador, no truncateText. | Dejar un solo mecanismo. Lo más simple es quitar truncateText y usar noWrap con title. Si se quiere un clamp de 2 líneas, aplicar WebkitLineClamp igual que en la tabla. | New |
| R-08 | Minor | src/modules/catalog/products/components/ColumnVisibilityMenu.tsx; ProductsPage.tsx > useState visibleColumns | La selección de columnas vive solo en useState, así que se pierde al salir de la página. No hay prueba de componente que cubra el menú ni la ocultación en ProductTable. Las pruebas existentes cubren solo las funciones puras. | Opcional: recordar la selección en localStorage dentro de try/catch si el uso lo pide. Anotar en unit-test-instructions.md que menú y tabla se verifican a mano. | New |

> R-01 Not re-checked this round

> R-02 Not re-checked this round

> R-03 Not re-checked this round

> R-04 Not re-checked this round

> R-05 Not re-checked this round

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| npx vitest run src/__tests__/modules/catalog/products | PASS: 9 archivos, 63 pruebas, incluidos truncateText (5) y columnVisibility (6) | Las utilidades puras se comportan como lo declaran sus pruebas. |
| npm run build | No ejecutado (fallo previo conocido TS5103 por ignoreDeprecations) | No pertenece a este cambio. |

### Summary

La Revisión 1 implementa lo pedido. La tabla recorta nombre y descripción a 2 líneas con elipsis. El conteo de categoría va en un contenedor circular, y las acciones editar y eliminar tienen un ancho reservado que evita el solape. El menú de columnas es un Select múltiple con todas las columnas visibles por defecto, y Producto y Acciones quedan fijas. Las únicas observaciones son menores y no bloquean.
