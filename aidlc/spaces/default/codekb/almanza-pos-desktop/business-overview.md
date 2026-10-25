# Panorama de negocio — Almanza POS Desktop

## Propósito

Almanza POS Desktop es un punto de venta de escritorio (Tauri) pensado para **pequeñas tiendas de abarrotes en México**. Cubre lo básico que necesita una tienda de barrio para vender, llevar el registro de ventas, controlar la caja y administrar el inventario, todo de forma local (sin servidor ni conexión a internet) sobre una base SQLite en la carpeta de datos de la aplicación.

El proyecto está en fase de prueba de concepto funcional: el sistema ya opera de punta a punta y el equipo está en un ciclo de mejoras incrementales (el intent activo prioriza el módulo de punto de venta y las imágenes de producto).

## Actores

| Actor | Rol en el sistema | Capacidades |
|---|---|---|
| Cajero (`cashier`) | Atiende el mostrador | Vender en el POS, consultar ventas de su caja, registrar abonos de clientes, abrir/cerrar su caja |
| Administrador (`admin`) | Dueño o encargado | Todo lo del cajero, más catálogo (productos, categorías), inventario, usuarios, reportes y configuración |
| Cliente con crédito | Persona que compra "fiado" | No usa el sistema; se registra su cuenta, límite de crédito, cargos y abonos |

Credenciales semilla: `root` / `root` (administrador), creadas en la primera ejecución.

## Capacidades de negocio

### Venta en mostrador (POS)
- Captura de productos por **código de barras** (lector) o por **nombre/código parcial** con Enter; si hay varias coincidencias se abre un modal para elegir.
- Carrito con cantidades, subtotales y total calculados con precisión decimal.
- **Productos a granel** (kg, litro, metro): se venden por unidad base, por subunidad (g, ml, cm) o por **monto en pesos** ("dame $20 de jamón"), conservando cómo se capturó para el ticket.
- Cobro mixto: **efectivo MXN, efectivo USD** (con tipo de cambio fijado al abrir la caja) y **transferencia**; cálculo de cambio.
- **Venta fiada / con anticipo**: el saldo pendiente se carga a la cuenta de un cliente respetando su límite de crédito.
- Impresión automática o manual del ticket en impresora térmica ESC/POS.

### Caja (cortes)
- Una sola caja abierta a la vez; apertura con fondo inicial y tipo de cambio opcional.
- Cierre con arqueo de efectivo MXN/USD, cálculo de esperado vs. real y diferencias, incluyendo abonos de clientes cobrados en esa caja.

### Catálogo e inventario
- Productos con nombre, descripción, código de barras único, precio, unidad, bandera a granel, categoría, stock y stock mínimo; activar/desactivar y eliminar (bloqueado si tiene ventas o ajustes).
- Categorías (nombre único).
- Ajustes de inventario (entrada/salida) con motivo y bitácora de stock anterior/nuevo.

### Clientes y crédito ("fiados")
- Alta de clientes con límite de crédito (valor por defecto configurable), consulta de saldo y movimientos, registro de abonos en una caja abierta.

### Administración y reportes
- Usuarios con rol admin/cajero.
- Reportes de ventas por rango (hasta 365 días): totales, ticket promedio, desglose por método de pago, productos más vendidos, crédito otorgado/cobrado, principales deudores; exportación a PDF y Excel.
- Configuración del negocio (nombre, dirección, RFC, **logotipo**), textos del ticket, impresora y crédito.

## Reglas de negocio relevantes

- Precisión: montos a 2 decimales, cantidades/stock a 3 decimales (frontend con `decimal.js`, backend con `shared/money.rs`).
- No se vende más que el stock disponible; productos no a granel solo aceptan cantidades enteras.
- Productos a granel solo con unidad base `kg`, `litro` o `metro`.
- Una venta debe tener al menos un producto y pertenecer a una caja abierta.
- Pagar en USD requiere tipo de cambio en la caja.
- Las ventas fiadas no se pueden cancelar; cancelar una venta pagada devuelve el stock.
- Un abono no puede exceder el adeudo del cliente.
- Solo puede existir una caja abierta.

## Glosario

| Término | Significado |
|---|---|
| Abarrotes | Tienda de víveres de barrio |
| Corte de caja | Cierre y arqueo de una sesión de caja |
| Fiado | Venta a crédito cargada a la cuenta de un cliente |
| A granel | Producto vendido por peso, volumen o longitud |
| T/C | Tipo de cambio USD→MXN de la sesión de caja |
| Ticket | Comprobante impreso en impresora térmica |

## Contexto del intent activo (261025-pos-search-grid-images)

El intent en curso pide: (1) sugerencias de búsqueda en vivo bajo la barra del POS manteniendo el Enter y el modal actuales; (2) una vista de cuadrícula de productos en el POS (foto, nombre, código, stock, precio; agrupada por categoría; ordenable por nombre/precio/stock; filtrada por la barra de búsqueda), alternable con la vista actual y recordada por sesión (no en BD); (3) imagen opcional y removible de producto al crear/editar, tomada de un archivo local y copiada a la carpeta de la app, con placeholder cuando no hay imagen. Ver `architecture.md` y `component-inventory.md` para los puntos de extensión.
