<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-10-25T19:03:50Z — "por sesión" (Q5=B) se interpreta como ligada a la sesión de login; la sesión de login vive en localStorage, así que la preferencia sobrevive a reinicios mientras no se cierre sesión y se borra al hacer logout.
- 2026-10-25T19:03:50Z — la descripción decía "filtrar por ese prefix", pero el usuario eligió "contiene" (Q1=C) en la pregunta explícita; la respuesta explícita prevalece sobre la palabra de la descripción.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
