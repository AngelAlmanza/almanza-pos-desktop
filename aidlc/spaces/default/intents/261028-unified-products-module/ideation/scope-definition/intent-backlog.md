# Backlog de la Intención — Módulo de Productos unificado

Priorizado con MoSCoW y ordenado por valor primero (Alcance Q4). Fuentes: `ideation/intent-capture/intent-statement.md` y `scope-definition-questions.md` ("Alcance Q<n>").

## Backlog priorizado

| Orden | ID | Elemento | MoSCoW | Depende de | Origen |
|-------|----|----------|--------|------------|--------|
| 1 | IB-1 | Listado unificado de productos con su stock y marca de bajo o agotado | Must | — | Alcance Q1 |
| 2 | IB-2 | Ajuste de stock (entrada, salida, corrección) desde el propio producto | Must | IB-1 | Alcance Q1 |
| 3 | IB-3 | Crear, editar y eliminar categorías dentro del módulo | Must | — | Alcance Q1 |
| 4 | IB-4 | Historial de ajustes general por fechas y por producto dentro del módulo | Must | IB-1 | Alcance Q1 |
| 5 | IB-5 | Quitar "Categorías" e "Inventario" del menú principal | Must | IB-2, IB-3, IB-4 | Alcance Q3 |
| — | IB-6 | Conservar todas las funciones actuales de las tres pantallas (aplica a todos los elementos) | Must | — | intent-statement.md, Problem Statement |
| 6 | IB-7 | Resumen de stock arriba del listado: total, bajos y agotados | Should | IB-1 | Alcance Q2 |
| 7 | IB-8 | Filtros por categoría y por estado de stock | Should | IB-1 | Alcance Q2 |
| 8 | IB-9 | Ficha de producto con sus datos, stock e historial | Could | IB-1, IB-4 | Alcance Q2 |

## Won't (esta vez)

| Elemento | Origen |
|----------|--------|
| Textos de ayuda por campo y mensajes guía para usuarios nuevos | Alcance Q8 |
| Cambios en la pantalla de venta (POS) | intent-statement.md, Initial Scope Signal |
| Cambios en los reportes | intent-statement.md, Initial Scope Signal |
| Datos nuevos en el sistema | intent-statement.md, Initial Scope Signal |

## Capacidad

Los elementos Must son 6 de 9 (IB-6 es transversal). No hay fecha límite (Alcance Q5), así que la regla de no pasar del 60% de capacidad en Must no aplica a una fecha fija; los elementos Should y Could se construyen después de los Must, en el orden indicado.

## Assumptions & Open Questions

None.
