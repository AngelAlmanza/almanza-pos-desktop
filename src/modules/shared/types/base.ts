import type { FillPattern } from 'exceljs';

export type UserRole = 'admin' | 'cashier';
export type SessionStatus = 'open' | 'closed';
export type SaleStatus = 'completed' | 'cancelled';
export type SaleInputMode = 'base' | 'sub' | 'amount';
export type AdjustmentType = 'add' | 'positive' | 'negative';
export type PaymentMethod = 'cash_mxn' | 'cash_usd' | 'cash' | 'transfer' | 'mixed';
export type ProductUnit = 'pieza' | 'kg' | 'litro' | 'metro' | 'paquete' | 'caja' | 'otro';
export type XlsxColor = { argb: string };
export type FillSolid = FillPattern & { type: 'pattern'; pattern: 'solid'; fgColor: XlsxColor };
