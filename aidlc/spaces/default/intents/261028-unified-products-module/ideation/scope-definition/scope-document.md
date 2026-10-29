# Documento de Alcance — Módulo de Productos unificado

Fuentes: `ideation/intent-capture/intent-statement.md` (intención aprobada) y las respuestas de `scope-definition-questions.md` (citadas como "Alcance Q<n>").

## Objetivo

Unir Productos, Categorías e Inventario en un solo módulo de Productos que sea sencillo y rápido de entender para usuarios nuevos y poco afines a la tecnología, sin perder ninguna función actual (intent-statement.md, Problem Statement).

## Alcance mínimo que ya entrega valor

La primera entrega incluye las cuatro capacidades indispensables (Alcance Q1):

- Un solo listado de productos que muestra el stock de cada uno y marca los que están bajos o agotados.
- Ajustar el stock (entrada, salida, corrección) desde el propio producto, sin ir a otra pantalla.
- Crear, editar y eliminar categorías dentro del mismo módulo.
- Consultar el historial de ajustes de stock, general por fechas y por producto, dentro del mismo módulo.

Además, las entradas "Categorías" e "Inventario" se quitan del menú principal: todo queda dentro de Productos (Alcance Q3).

## Dentro del alcance

| Capacidad | Prioridad | Origen |
|-----------|-----------|--------|
| Listado unificado con estado de stock (normal, bajo, agotado) | Must | Alcance Q1; intent-statement.md, Success Metrics |
| Ajuste de stock desde el producto | Must | Alcance Q1 |
| Gestión de categorías dentro del módulo | Must | Alcance Q1 |
| Historial de ajustes (general y por producto) dentro del módulo | Must | Alcance Q1 |
| Quitar Categorías e Inventario del menú principal | Must | Alcance Q3 |
| Conservar todas las funciones actuales de productos, categorías e inventario | Must | intent-statement.md, Problem Statement |
| Resumen de stock arriba del listado (total, bajos, agotados) | Should | Alcance Q2 |
| Filtros por categoría y por estado de stock | Should | Alcance Q2 |
| Ficha de producto con sus datos, stock e historial | Could | Alcance Q2 |

## Fuera del alcance

| Exclusión | Origen |
|-----------|--------|
| Cambios en la pantalla de venta (POS) | intent-statement.md, Initial Scope Signal |
| Agregar datos nuevos al sistema; solo se reorganiza y mejora lo que ya existe | intent-statement.md, Initial Scope Signal |
| Cambios en los reportes | intent-statement.md, Initial Scope Signal |
| Textos de ayuda por campo y mensajes guía para usuarios nuevos | Alcance Q8 |

"Datos nuevos" significa información que el sistema hoy no guarda (por ejemplo, un campo nuevo en el producto). Mostrar de otra forma lo que ya existe, como el stock y el stock mínimo, sí está permitido (regla del proyecto aprendida en la etapa anterior).

## Criterios de éxito comprobables

| Criterio | Cómo se comprueba | Origen |
|----------|-------------------|--------|
| Un usuario nuevo da de alta un producto con categoría y stock inicial sin ayuda en menos de 2 minutos | Tú mismo, simulando a un usuario nuevo, cronometras desde que abres el módulo hasta que guardas | intent-statement.md, Success Metrics; Alcance Q7 |
| Menos pantallas para las tareas diarias | Alta, ajuste de stock y revisar faltantes se completan sin salir del módulo de Productos | intent-statement.md, Success Metrics; Alcance Q6 |
| El stock bajo se ve sin buscarlo | Los productos bajos o agotados aparecen marcados en el listado del módulo | intent-statement.md, Success Metrics; Alcance Q1 |
| No se pierde ninguna función | Cada función actual de las tres pantallas sigue disponible dentro del módulo | intent-statement.md, Success Metrics |

## Orden y fechas

- Se construye primero lo que más valor da al usuario: el listado unificado con el stock visible (Alcance Q4).
- No hay fecha límite (Alcance Q5).

## Mapa del flujo de valor

Cada tarea diaria del usuario y dónde se resuelve después del cambio:

| Tarea del usuario | Hoy | Después |
|-------------------|-----|---------|
| Dar de alta un producto con categoría y stock inicial | Pantalla de Productos (la categoría se gestiona aparte en Categorías) | Módulo de Productos |
| Ajustar el stock de un producto | Pantalla de Inventario | Módulo de Productos, desde el propio producto |
| Revisar qué productos faltan | Pantalla de Inventario, pestaña de stock | Módulo de Productos, marcados en el listado |
| Crear o editar una categoría | Pantalla de Categorías | Módulo de Productos |
| Consultar ajustes pasados | Pantalla de Inventario, pestaña de historial | Módulo de Productos |

## Dependencias

- El ajuste de stock desde el producto y el historial por producto necesitan que exista el listado unificado donde se elige el producto.
- Quitar las entradas del menú depende de que categorías, ajustes e historial ya estén disponibles dentro del módulo, para no perder funciones en el camino.

## Assumptions & Open Questions

None.
