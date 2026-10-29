# Resumen de la Iniciativa — Módulo de Productos unificado

## Intención y problema

Productos, Categorías e Inventario son tres pantallas separadas y confunden. Cuesta pasar de una a otra para una sola tarea, las alertas de stock bajo no se ven desde el listado de productos, y Categorías e Inventario parecen pantallas sueltas. La iniciativa los une en un solo módulo de Productos, sencillo y rápido de entender para usuarios nuevos y poco afines a la tecnología, sin perder ninguna función actual (`intent-capture/intent-statement.md`).

Usuarios: dueños que también venden, y empleados o cajeros con poca experiencia en computadoras (`intent-statement.md`, Target Customer).

## Validación de mercado

No se hizo investigación de mercado: este trabajo no la incluye. El problema viene de una revisión informal con un usuario de prueba (`intent-statement.md`, Initiative Trigger). Que otros usuarios compartan la confusión es una hipótesis, no un hecho comprobado.

## Viabilidad y riesgos

No hubo una etapa de viabilidad aparte. Riesgos reconocidos (approval-handoff Q1):

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Perder una función actual al mover las tres pantallas a una | Media | Alto | Lista de todas las funciones actuales, armada en Análisis de Requisitos y revisada antes de entregar |
| Pocas pruebas automáticas: el plan pide solo una prueba puntual además de las existentes | Media | Medio | La lista de funciones se comprueba también a mano |

## Límite del alcance

- **Indispensable (Must):**
  - un solo listado con el stock de cada producto, que marca los bajos o agotados;
  - ajustar el stock desde el propio producto;
  - las categorías dentro del módulo;
  - el historial de ajustes dentro del módulo;
  - quitar "Categorías" e "Inventario" del menú;
  - conservar todas las funciones actuales (`scope-definition/intent-backlog.md`).
- **Deseable (Should):** un resumen de stock y filtros por categoría y estado de stock. **Si da tiempo (Could):** una ficha de producto.
- **Fuera:** la pantalla de venta, los reportes, los datos nuevos y los textos de ayuda por campo (`scope-definition/scope-document.md`).
- **Criterios comprobables:**
  - un usuario nuevo da de alta un producto en menos de 2 minutos, cronometrado por el responsable simulando a un usuario nuevo;
  - las tareas diarias se completan sin salir del módulo;
  - el stock bajo se ve marcado en el listado;
  - no se pierde ninguna función (`scope-document.md`).

## Visuales del concepto

En esta fase no se hicieron bocetos. El plan incluye bocetos refinados (Refined Mockups) en la siguiente fase, antes de construir.

## Plan de equipo

Lo construye una sola persona, con ayuda de IA (approval-handoff Q2). Esa misma persona decide qué entra y qué tiene prioridad, y revisa cada paso (`intent-capture/stakeholder-map.md`). No hay fecha límite (`scope-document.md`).

## Recomendación: Adelante (Go)

La intención, el alcance y los criterios de éxito son claros y se pueden comprobar. Los riesgos principales tienen mitigación, y el cambio se limita a reorganizar pantallas que ya existen, sin datos nuevos. Se recomienda pasar al Análisis de Requisitos, cuya primera tarea es la lista de funciones actuales que no se deben perder.

## Assumptions & Open Questions

- [assumption] Que otros usuarios compartan la confusión que vio el usuario de prueba no se ha comprobado; la meta de menos de 2 minutos servirá de primera señal.
