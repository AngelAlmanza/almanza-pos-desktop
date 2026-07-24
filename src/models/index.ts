import type {
  AdjustmentType,
  PaymentMethod,
  ProductUnit,
  SaleInputMode,
  SaleStatus,
  SessionStatus,
  UserRole,
} from '../types';

// User models
export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Category models
export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

// Product models
export interface Product {
  id: number;
  name: string;
  description: string | null;
  barcode: string | null;
  price: number;
  unit: ProductUnit;
  is_bulk: boolean;
  category_id: number | null;
  category_name: string | null;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Cash Register models
export interface CashRegisterSession {
  id: number;
  user_id: number;
  user_name: string | null;
  opening_amount: number;
  closing_amount: number | null;
  closing_cash_mxn: number | null;
  closing_cash_usd: number | null;
  exchange_rate: number | null;
  status: SessionStatus;
  opened_at: string;
  closed_at: string | null;
  total_sales: number | null;
  total_transactions: number | null;
}

export interface CashRegisterSummary {
  session: CashRegisterSession;
  total_sales: number;
  total_transactions: number;
  sales_cash_mxn: number;
  sales_cash_usd: number;
  sales_transfer: number;
  account_payments_cash_mxn: number;
  account_payments_cash_usd: number;
  account_payments_transfer: number;
  total_change_given: number;
  expected_cash_mxn: number;
  expected_cash_usd: number;
  actual_cash_mxn: number;
  actual_cash_usd: number;
  difference_mxn: number;
  difference_usd: number;
}

// Sale models
export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  base_unit: ProductUnit | null;
  input_mode: SaleInputMode | null;
  input_value: number | null;
  input_unit: string | null;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  cash_register_session_id: number;
  user_id: number;
  user_name: string | null;
  total: number;
  customer_id: number | null;
  customer_name: string | null;
  credit_amount: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  payment_cash_mxn: number;
  payment_cash_usd: number;
  payment_transfer: number;
  exchange_rate: number | null;
  change_amount: number;
  status: SaleStatus;
  created_at: string;
  items: SaleItem[];
}

export interface SalesReport {
  total_sales: number;
  total_transactions: number;
  average_sale: number;
  total_credit_sold: number;
  total_account_collected: number;
  outstanding_balance: number;
  top_debtors: Customer[];
  sales: Sale[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  credit_limit: number;
  active: boolean;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerAccountMovement {
  id: number;
  customer_id: number;
  /** Current name joined from the customer relation; not a persisted snapshot. */
  customer_name: string;
  sale_id: number | null;
  cash_register_session_id: number;
  user_id: number;
  user_name: string | null;
  movement_type: 'sale_charge' | 'account_payment';
  amount: number;
  payment_cash_mxn: number;
  payment_cash_usd: number;
  payment_transfer: number;
  exchange_rate: number | null;
  notes: string | null;
  created_at: string;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

// Inventory models
export interface InventoryAdjustment {
  id: number;
  product_id: number;
  product_name: string | null;
  user_id: number;
  user_name: string | null;
  adjustment_type: AdjustmentType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// Setting models
export type SettingValueType = 'string' | 'multiline' | 'number' | 'boolean' | 'image_path';

export interface Setting {
  key: string;
  value: string | null;
  value_type: SettingValueType;
  label: string;
  description: string | null;
  group_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PrinterPaperSize = '58mm' | '80mm' | '100mm' | string;
export type PrinterCutType = 'full' | 'partial' | 'none';

export interface PrinterSettings {
  enabled: boolean;
  auto_print_sale: boolean;
  transport: string;
  display_name: string;
  usb_vendor_id: string | null;
  usb_product_id: string | null;
  port_hint: string | null;
  paper_size: PrinterPaperSize;
  dpi: number;
  cut_type: PrinterCutType;
  encoding: string;
}

export interface PrinterInfo {
  id: string;
  name: string;
  vendor_id: string;
  product_id: string;
  port_name: string | null;
  transport: string;
}

export interface SaleQuantitySelection {
  quantity: number;
  input_mode: SaleInputMode;
  input_value: number;
  input_unit: string;
}

// Cart item for POS
export interface CartItem extends SaleQuantitySelection {
  line_key: string;
  product: Product;
  base_unit: ProductUnit;
  subtotal: number;
}
