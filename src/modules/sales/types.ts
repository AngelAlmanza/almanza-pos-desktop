import type { Customer } from '@modules/customers/types';
import type { PaymentMethod, ProductUnit, SaleInputMode, SaleStatus } from '@modules/shared/types/base';

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

export interface TopProduct {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
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
