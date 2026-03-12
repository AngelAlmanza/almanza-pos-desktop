import type { AdjustmentType, ProductUnit, UserRole } from '../types';

// Auth DTOs
export interface LoginDTO {
  username: string;
  password: string;
}

// User DTOs
export interface CreateUserDTO {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  id: number;
  username?: string;
  password?: string;
  full_name?: string;
  role?: UserRole;
  active?: boolean;
}

// Category DTOs
export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  id: number;
  name?: string;
  description?: string;
}

// Product DTOs
export interface CreateProductDTO {
  name: string;
  description?: string;
  barcode?: string;
  price: number;
  unit: ProductUnit;
  category_id?: number;
  stock?: number;
  min_stock?: number;
}

export interface UpdateProductDTO {
  id: number;
  name?: string;
  description?: string;
  barcode?: string;
  price?: number;
  unit?: ProductUnit;
  category_id?: number;
  min_stock?: number;
  active?: boolean;
}

// Cash Register DTOs
export interface OpenCashRegisterDTO {
  user_id: number;
  opening_amount: number;
  exchange_rate?: number;
}

export interface CloseCashRegisterDTO {
  session_id: number;
  closing_cash_mxn: number;
  closing_cash_usd: number;
}

// Sale DTOs
export interface CreateSaleItemDTO {
  product_id: number;
  quantity: number;
}

export interface CreateSaleDTO {
  cash_register_session_id: number;
  user_id: number;
  payment_cash_mxn: number;
  payment_cash_usd: number;
  payment_transfer: number;
  items: CreateSaleItemDTO[];
}

export interface DateRangeDTO {
  start_date: string;
  end_date: string;
}

// Setting DTOs
export interface UpdateSettingDTO {
  key: string;
  value: string | null;
}

export interface CreateSettingDTO {
  key: string;
  value?: string;
  value_type: string;
  label: string;
  description?: string;
  group_name: string;
  sort_order?: number;
}

// Inventory DTOs
export interface CreateInventoryAdjustmentDTO {
  product_id: number;
  user_id: number;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason?: string;
}
