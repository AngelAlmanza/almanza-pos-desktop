// User models
export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'cashier';
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
  unit: string;
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
  exchange_rate: number | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  total_sales: number | null;
  total_transactions: number | null;
}

export interface CashRegisterSummary {
  session: CashRegisterSession;
  total_sales: number;
  total_transactions: number;
  total_cash: number;
  expected_cash: number;
  difference: number;
}

// Sale models
export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  cash_register_session_id: number;
  user_id: number;
  user_name: string | null;
  total: number;
  payment_method: string;
  payment_amount: number;
  change_amount: number;
  status: string;
  created_at: string;
  items: SaleItem[];
}

export interface SalesReport {
  total_sales: number;
  total_transactions: number;
  average_sale: number;
  sales: Sale[];
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
  adjustment_type: 'add' | 'positive' | 'negative';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
}

// Cart item for POS
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}
