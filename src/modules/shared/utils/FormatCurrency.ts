export const formatCurrency = (amount: number, currency: string = 'mxn'): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};