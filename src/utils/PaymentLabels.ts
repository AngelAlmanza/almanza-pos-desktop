const LABELS: Record<string, string> = {
  cash_mxn: 'Efectivo MXN',
  cash_usd: 'Efectivo USD',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

export function paymentMethodLabel(method: string): string {
  return LABELS[method] ?? method;
}
