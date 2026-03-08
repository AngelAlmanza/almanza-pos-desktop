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

  it('returns the raw method key when label is not found', () => {
    expect(paymentMethodLabel('unknown_method')).toBe('unknown_method');
    expect(paymentMethodLabel('')).toBe('');
  });
});
