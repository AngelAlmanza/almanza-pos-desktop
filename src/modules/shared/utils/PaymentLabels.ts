import type { PaymentMethod } from '@modules/shared/types/base';

const LABELS: Record<PaymentMethod, string> = {
  cash_mxn: 'Efectivo MXN',
  cash_usd: 'Efectivo USD',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

export function paymentMethodLabel(method: PaymentMethod): string {
  return LABELS[method];
}
