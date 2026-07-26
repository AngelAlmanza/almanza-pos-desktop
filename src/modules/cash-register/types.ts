export type { CashRegisterSession, CashRegisterSummary } from '@modules/shared/types/cashRegister';

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
