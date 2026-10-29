# Trazabilidad entre unidades — Módulo de Productos unificado

Alcance sin unidades (`bugfix`): toda la cobertura viene de `construction/code-generation/traceability.json`. No hay historias de usuario (la etapa no se ejecutó), así que no hay criterios `AC` que enumerar.

**Veredicto: PASA** — los 17 identificadores de `requirements.md` están cubiertos con estado `OK` y su archivo existe.

| ID | Etapa propietaria | Archivo de destino | Estado |
|----|-------------------|--------------------|--------|
| FR1 | code-generation | `src/core/layout/navItems.ts` | OK |
| FR2 | code-generation | `src/modules/catalog/products/components/ProductTable.tsx` | OK |
| FR3 | code-generation | `src/modules/catalog/products/components/ProductFormDialog.tsx` | OK |
| FR4 | code-generation | `src/modules/catalog/products/pages/ProductsPage.tsx` | OK |
| FR5 | code-generation | `src/modules/catalog/products/components/ProductSidePanel.tsx` | OK |
| FR6 | code-generation | `src/modules/catalog/products/components/CategorySidebar.tsx` | OK |
| FR7 | code-generation | `src/modules/catalog/products/components/StockHistoryTab.tsx` | OK |
| FR8 | code-generation | `src/modules/catalog/products/components/StockSummaryCards.tsx` | OK |
| FR9 | code-generation | `src/__tests__/modules/catalog/products/stockStatus.test.ts` | OK |
| FR10 | code-generation | `src/modules/catalog/products/components/ProductSidePanel.tsx` | OK |
| NFR1 | code-generation | `src/modules/catalog/products/utils/stockStatus.ts` | OK |
| NFR2 | code-generation | `src/modules/catalog/products/pages/ProductsPage.tsx` | OK |
| NFR3 | code-generation | `src/modules/catalog/products/components/AdjustmentTypePicker.tsx` | OK |
| NFR4 | code-generation | `src/modules/catalog/products/utils/stockAdjustment.ts` | OK |
| NFR5 | code-generation | `src/modules/catalog/products/utils/productPermissions.ts` | OK |
| NFR6 | code-generation | `src/__tests__/core/layout/navItems.test.ts` | OK |
| NFR7 | code-generation | `src/modules/catalog/products/utils/categoryDeletion.ts` | OK |

## Elementos sin cobertura

Ninguno.
