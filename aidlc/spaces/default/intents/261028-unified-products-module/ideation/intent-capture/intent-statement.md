# Declaración de Intención — Módulo de Productos unificado

## Problem Statement

Hoy Productos, Categorías e Inventario son módulos separados y causan confusión: las categorías son un simple catálogo para seccionar productos, el inventario solo sirve para registrar ajustes, y Productos se siente como un catálogo desconectado de las alertas de stock. [desc]

Los tres problemas pesan por igual: saltar entre pantallas para una sola tarea, que las alertas de stock bajo no se vean desde el listado de productos, y que Categorías e Inventario parezcan pantallas sueltas sin propósito claro. [Q1]

La intención es combinar todo en un solo módulo de Productos, sencillo y entendible para usuarios poco afines a la tecnología y fácil y rápido de entender para un usuario nuevo, sin perder funcionalidad actual y mejorando la UI/UX. [desc]

## Target Customer

| Usuario | Cómo se beneficia | Source |
|---------|-------------------|--------|
| Dueños o administradores del negocio que también venden | Gestionan productos, categorías y stock desde un solo lugar | [Q2] [desc] |
| Empleados o cajeros con poca experiencia en computadoras | Entienden el módulo rápido sin necesitar ayuda | [Q2] [desc] |

## Success Metrics

- Un usuario nuevo da de alta un producto con categoría y stock inicial sin ayuda en menos de 2 minutos. [Q3] [Q9]
- Las tareas diarias (alta, ajuste de stock, revisar faltantes) requieren menos pantallas o clics que hoy; se hacen desde un solo módulo de Productos en lugar de tres. [Q3] [desc]
- El usuario ve qué productos tienen stock bajo sin tener que buscarlos. [Q3]
- Ninguna funcionalidad actual se pierde con la unificación. [desc]

## Initiative Trigger

La mejora nace de una revisión informal del sistema con un amigo, que actuó como usuario de prueba y señaló la confusión entre los tres módulos. [Q4] [desc]

## Initial Scope Signal

**Alcance seleccionado por el flujo de trabajo (workflow-selected):** `bugfix`. [scope]

**Límite del producto confirmado por el usuario — queda fuera de esta primera versión:**

- No se cambia la pantalla de venta (POS). [Q8]
- No se agregan datos nuevos al sistema; solo se reorganiza y mejora lo que ya existe. [Q8]
- No se tocan los reportes. [Q8]

**Queda dentro:** unificar Productos, Categorías e Inventario en un solo módulo de Productos y mejorar su UI/UX, conservando toda la funcionalidad actual. [desc]

## Assumptions & Open Questions

None.
