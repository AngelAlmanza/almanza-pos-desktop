import type { AdjustmentType, ProductUnit, SaleInputMode, UserRole } from '../types';

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
  is_bulk: boolean;
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
  is_bulk?: boolean;
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
  input_mode: SaleInputMode;
  input_value: number;
  input_unit: string;
}

export interface CreateSaleDTO {
  cash_register_session_id: number;
  user_id: number;
  payment_cash_mxn: number;
  payment_cash_usd: number;
  payment_transfer: number;
  customer_id?: number;
  items: CreateSaleItemDTO[];
}

// Customers / accounts receivable DTOs
export interface CreateCustomerDTO {
  name: string;
  phone?: string;
  notes?: string;
  credit_limit?: number;
}

export interface UpdateCustomerDTO {
  id: number;
  name?: string;
  phone?: string;
  notes?: string;
  credit_limit?: number;
  active?: boolean;
}

export interface CreateCustomerPaymentDTO {
  customer_id: number;
  cash_register_session_id: number;
  user_id: number;
  payment_cash_mxn: number;
  payment_cash_usd: number;
  payment_transfer: number;
  notes?: string;
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

export interface SavePrinterConfigDTO {
  enabled: boolean;
  auto_print_sale: boolean;
  transport: string;
  display_name: string;
  usb_vendor_id: string | null;
  usb_product_id: string | null;
  port_hint: string | null;
  paper_size: string;
  dpi: number;
  cut_type: 'full' | 'partial' | 'none';
  encoding: string;
}

// Inventory DTOs
export interface CreateInventoryAdjustmentDTO {
  product_id: number;
  user_id: number;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason?: string;
}
