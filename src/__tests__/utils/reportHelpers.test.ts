import { describe, expect, it } from 'vitest';
import type { Sale } from '../../models';
import {
  MAX_REPORT_RANGE_DAYS,
  computeMetrics,
  filterSales,
  isRangeTooLong,
} from '../../utils/reportHelpers';

const DAY_MS = 86_400_000;
const BASE = new Date('2025-01-01').getTime();

const makeSale = (overrides: Partial<Sale>): Sale => ({
  id: 1,
  cash_register_session_id: 1,
  user_id: 1,
  user_name: 'Cajero Test',
  total: 100,
  payment_method: 'cash_mxn',
  payment_amount: 100,
  payment_cash_mxn: 100,
  payment_cash_usd: 0,
  payment_transfer: 0,
  exchange_rate: null,
  change_amount: 0,
  status: 'completed',
  created_at: '2025-01-01T12:00:00',
  items: [],
  ...overrides,
});

// ── MAX_REPORT_RANGE_DAYS ────────────────────────────────────────────────────

describe('MAX_REPORT_RANGE_DAYS', () => {
  it('is 365', () => {
    expect(MAX_REPORT_RANGE_DAYS).toBe(365);
  });
});

// ── isRangeTooLong ───────────────────────────────────────────────────────────

describe('isRangeTooLong', () => {
  it('returns false for exactly 365 days', () => {
    expect(isRangeTooLong(BASE, BASE + 365 * DAY_MS)).toBe(false);
  });

  it('returns true when range exceeds 365 days', () => {
    expect(isRangeTooLong(BASE, BASE + 366 * DAY_MS)).toBe(true);
  });

  it('returns false for same-day range', () => {
    expect(isRangeTooLong(BASE, BASE)).toBe(false);
  });

  it('returns false for 1-day range', () => {
    expect(isRangeTooLong(BASE, BASE + DAY_MS)).toBe(false);
  });

  it('returns true for a multi-year range', () => {
    expect(isRangeTooLong(BASE, BASE + 730 * DAY_MS)).toBe(true);
  });
});

// ── filterSales ──────────────────────────────────────────────────────────────

describe('filterSales', () => {
  const completed = makeSale({ id: 1, status: 'completed' });
  const cancelled = makeSale({ id: 2, status: 'cancelled' });
  const mixed = [completed, cancelled];

  it('excludes cancelled when includeCancelled is false', () => {
    const result = filterSales(mixed, false);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
  });

  it('includes all sales when includeCancelled is true', () => {
    expect(filterSales(mixed, true)).toHaveLength(2);
  });

  it('handles an empty list', () => {
    expect(filterSales([], false)).toEqual([]);
    expect(filterSales([], true)).toEqual([]);
  });

  it('returns all when all are completed and includeCancelled is false', () => {
    const allCompleted = [completed, makeSale({ id: 3 })];
    expect(filterSales(allCompleted, false)).toHaveLength(2);
  });

  it('returns empty when all are cancelled and includeCancelled is false', () => {
    const allCancelled = [cancelled, makeSale({ id: 4, status: 'cancelled' })];
    expect(filterSales(allCancelled, false)).toHaveLength(0);
  });
});

// ── computeMetrics ───────────────────────────────────────────────────────────

describe('computeMetrics', () => {
  const sales = [
    makeSale({ id: 1, total: 200, status: 'completed', payment_method: 'cash_mxn', payment_cash_mxn: 200 }),
    makeSale({ id: 2, total: 150, status: 'completed', payment_method: 'transfer', payment_cash_mxn: 0, payment_transfer: 150 }),
    makeSale({ id: 3, total: 80, status: 'cancelled' }),
  ];

  it('computes totalRevenue from completed only', () => {
    expect(computeMetrics(sales).totalRevenue).toBeCloseTo(350);
  });

  it('counts completed sales correctly', () => {
    expect(computeMetrics(sales).completedCount).toBe(2);
  });

  it('counts cancelled sales correctly', () => {
    expect(computeMetrics(sales).cancelledCount).toBe(1);
  });

  it('computes cancelledAmount from cancelled only', () => {
    expect(computeMetrics(sales).cancelledAmount).toBeCloseTo(80);
  });

  it('computes averageSale correctly', () => {
    expect(computeMetrics(sales).averageSale).toBeCloseTo(175);
  });

  it('groups byPaymentMethod for completed sales only', () => {
    const { byPaymentMethod } = computeMetrics(sales);
    expect(byPaymentMethod['cash_mxn']).toEqual({ count: 1, amount: 200 });
    expect(byPaymentMethod['transfer']).toEqual({ count: 1, amount: 150 });
    expect(byPaymentMethod['cash_usd']).toBeUndefined();
  });

  it('accumulates multiple sales with the same payment method', () => {
    const twoMxn = [
      makeSale({ id: 10, total: 100, payment_method: 'cash_mxn' }),
      makeSale({ id: 11, total: 50, payment_method: 'cash_mxn' }),
    ];
    const { byPaymentMethod } = computeMetrics(twoMxn);
    expect(byPaymentMethod['cash_mxn']).toEqual({ count: 2, amount: 150 });
  });

  it('returns zeroes for an empty sales array', () => {
    const m = computeMetrics([]);
    expect(m.totalRevenue).toBe(0);
    expect(m.completedCount).toBe(0);
    expect(m.cancelledCount).toBe(0);
    expect(m.cancelledAmount).toBe(0);
    expect(m.averageSale).toBe(0);
    expect(m.byPaymentMethod).toEqual({});
  });

  it('averageSale is 0 when there are no completed sales', () => {
    const onlyCancelled = [makeSale({ status: 'cancelled' })];
    expect(computeMetrics(onlyCancelled).averageSale).toBe(0);
  });

  it('does not include cancelled sales in byPaymentMethod', () => {
    const onlyCancelled = [makeSale({ id: 1, status: 'cancelled', payment_method: 'cash_mxn' })];
    expect(computeMetrics(onlyCancelled).byPaymentMethod).toEqual({});
  });
});
