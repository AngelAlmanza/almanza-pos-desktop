# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- In Tauri 2, `$APPDATA` in `assetProtocol` scopes already resolves to `app_data_dir` (it includes the app identifier); never repeat the identifier in the scope, or the asset protocol answers 403 Forbidden. (learned 2026-10-26) <!-- cid:261025-pos-search-grid-images:code-generation:27099e1bb7d8fe51a320af7773c50efbe9a61395ac77e49ece9b337b9cecff47 -->
- "sin datos nuevos" (Q8) y "añadiendo mejoras" (desc) se leen juntos: las mejoras son de UI/UX sobre los datos que ya existen, no campos nuevos. (learned 2026-10-28) <!-- cid:261028-unified-products-module:intent-capture:7a7d8351244bae06eb03ca1919b2428f59a7391b587d290b9ede8616d9049023 -->
- "en pocos minutos" se concretó con una pregunta de seguimiento (Q9): menos de 2 minutos para el primer alta sin ayuda. (learned 2026-10-28) <!-- cid:261028-unified-products-module:intent-capture:0e4788e769e49c012b884d3b4081b2962b50c27a56d7e47c535fa07a72359405 -->
- Hoy solo el administrador entra al catálogo (productos, categorías, inventario); cuando una intención diga que lo usan empleados, confirmar los permisos por rol antes de escribir requisitos. (learned 2026-10-28) <!-- cid:261028-unified-products-module:requirements-analysis:c4d4e131133d60da2df964e74c6c67d3c63b07ba31066229e37898644a0f107d -->
- En el módulo de Productos, todo lo de un producto (ajuste de stock e historial) vive en el mismo panel lateral, en lugar de modales o filas desplegables separadas. (learned 2026-10-28) <!-- cid:261028-unified-products-module:refined-mockups:a0c15e06500700e06898d92f3365c28b8d17b15619cb838a35dee14f0a80b2aa -->
