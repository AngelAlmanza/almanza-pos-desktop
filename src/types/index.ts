/** Roles de usuario soportados por el sistema. */
export type UserRole = 'admin' | 'cashier';

/** Estado del ciclo de vida de una sesión de caja. */
export type SessionStatus = 'open' | 'closed';

/** Estado del ciclo de vida de una venta. */
export type SaleStatus = 'completed' | 'cancelled';

/** Dirección de un ajuste de inventario. */
export type AdjustmentType = 'add' | 'positive' | 'negative';

/** Métodos de pago aceptados en el punto de venta. */
export type PaymentMethod = 'cash_mxn' | 'cash_usd' | 'cash' | 'transfer' | 'mixed';

/** Unidades de medida disponibles para productos. */
export type ProductUnit = 'pieza' | 'kg' | 'litro' | 'metro' | 'paquete' | 'caja' | 'otro';
