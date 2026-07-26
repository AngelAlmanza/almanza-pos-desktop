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
