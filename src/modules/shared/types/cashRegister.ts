import type { SessionStatus } from './base';

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
