import { describe, it, expect } from 'vitest';
import { paymentMethodLabel } from '../../utils/PaymentLabels';

describe('paymentMethodLabel', () => {
  it('returns label for cash_mxn', () => {
    expect(paymentMethodLabel('cash_mxn')).toBe('Efectivo MXN');
  });

  it('returns label for cash_usd', () => {
    expect(paymentMethodLabel('cash_usd')).toBe('Efectivo USD');
  });

  it('returns label for cash (generic)', () => {
    expect(paymentMethodLabel('cash')).toBe('Efectivo');
  });

  it('returns label for transfer', () => {
    expect(paymentMethodLabel('transfer')).toBe('Transferencia');
  });

  it('returns label for mixed payments', () => {
    expect(paymentMethodLabel('mixed')).toBe('Mixto');
  });

  it('every PaymentMethod has a non-empty label', () => {
    // El tipo es cerrado: el Record cubre todos los valores posibles.
    // Este test garantiza que ninguna variante quede sin etiqueta.
    const methods = ['cash_mxn', 'cash_usd', 'cash', 'transfer', 'mixed'] as const;
    for (const method of methods) {
      expect(paymentMethodLabel(method)).toBeTruthy();
    }
  });
});
