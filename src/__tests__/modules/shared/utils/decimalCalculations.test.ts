/**
 * Tests for the shared money/quantity helpers used by the POS flow.
 */
import { describe, it, expect } from 'vitest';
import {
  calcChange,
  hasSufficientStock,
  isPaymentSufficient,
  mxnToUsd,
  multiplyMoney,
  roundQuantity,
  sumMoney,
  sumQuantity,
  totalPaidMxn,
  usdToMxn,
} from '@modules/shared/utils/money';

// --- Cart total ---

describe('Cart total calculation', () => {
  it('sums subtotals without floating point drift', () => {
    // Prove that raw JS float addition drifts (canonical example):
    expect(0.1 + 0.2).not.toBe(0.3);

    const total = sumMoney([19.99, 9.99, 4.99]);
    expect(total).toBe(34.97);
  });

  it('handles a single item', () => {
    expect(sumMoney([89.50])).toBe(89.50);
  });

  it('returns zero for an empty cart', () => {
    expect(sumMoney([])).toBe(0);
  });

  it('sums many small amounts without accumulation error', () => {
    // 10 items at $0.10 each → $1.00 exactly
    const subtotals = Array(10).fill(0.10);
    const total = sumMoney(subtotals);
    expect(total).toBe(1.00);
  });

  it('handles amounts with repeating decimals', () => {
    // 3 items at $33.33 → $99.99 (raw: 99.99000000000001)
    const total = sumMoney([33.33, 33.33, 33.33]);
    expect(total).toBe(99.99);
  });
});

// --- USD to MXN conversion ---

describe('USD to MXN conversion', () => {
  it('converts whole USD amounts at a round exchange rate', () => {
    expect(usdToMxn(10, 20)).toBe(200);
  });

  it('converts whole USD at a fractional exchange rate', () => {
    // $10 USD × 17.35 = $173.50 MXN
    expect(usdToMxn(10, 17.35)).toBe(173.50);
  });

  it('rounds converted USD amounts to 2 decimals', () => {
    // $5.50 USD × 17.35 = $95.425 → business rule rounds to $95.43 MXN
    expect(usdToMxn(5.50, 17.35)).toBe(95.43);
  });

  it('handles zero USD', () => {
    expect(usdToMxn(0, 17.50)).toBe(0);
  });

  it('converts total to USD for display without precision drift', () => {
    // $200 MXN ÷ 17.50 = $11.428... USD → displayed as $11.43
    expect(mxnToUsd(200, 17.50)).toBe(11.43);
  });
});

// --- Payment totals (mixed methods) ---

describe('Mixed payment totalPaid calculation', () => {
  const rate = 17.50;

  it('cash MXN only', () => {
    expect(totalPaidMxn(150, 0, 0, rate)).toBe(150);
  });

  it('cash USD only (converts to MXN)', () => {
    // $5 USD × 17.50 = $87.50 MXN
    expect(totalPaidMxn(0, 5, 0, rate)).toBe(87.50);
  });

  it('transfer only', () => {
    expect(totalPaidMxn(0, 0, 200, rate)).toBe(200);
  });

  it('cash MXN + transfer', () => {
    // $100 + $50 = $150
    expect(totalPaidMxn(100, 0, 50, rate)).toBe(150);
  });

  it('all three methods combined', () => {
    // $50 MXN + ($2 USD × 17.50 = $35 MXN) + $25 transfer = $110 MXN
    expect(totalPaidMxn(50, 2, 25, rate)).toBe(110);
  });

  it('accumulates fractional amounts without precision loss', () => {
    // $89.99 MXN + $0 USD + $10.01 transfer = $100 exactly
    expect(totalPaidMxn(89.99, 0, 10.01, rate)).toBe(100);
  });

  it('works without an exchange rate (USD treated as MXN 1:1)', () => {
    expect(totalPaidMxn(50, 10, 0, null)).toBe(60);
  });
});

// --- Change calculation ---

describe('Change (cambio) calculation', () => {
  it('returns zero when payment is exact', () => {
    expect(calcChange(100, 100)).toBe(0);
  });

  it('returns positive change when customer overpays', () => {
    // Pay $200 for a $150 item
    expect(calcChange(150, 200)).toBe(50);
  });

  it('calculates change without floating point error', () => {
    // Raw JS: 100 - 89.99 = 10.010000000000001
    const rawChange = 100 - 89.99;
    expect(rawChange).not.toBe(10.01); // prove the raw problem

    expect(calcChange(89.99, 100)).toBe(10.01);
  });

  it('handles one-cent difference correctly', () => {
    // Pay $1.00 for a $0.99 item → $0.01 change
    expect(calcChange(0.99, 1.00)).toBe(0.01);
  });

  it('detects negative change (underpayment)', () => {
    expect(calcChange(150, 100)).toBe(-50);
  });

  it('detects sufficient payment using normalized values', () => {
    expect(isPaymentSufficient(89.99, 100)).toBe(true);
    expect(isPaymentSufficient(89.99, 89.99)).toBe(true);
    expect(isPaymentSufficient(89.99, 89.98)).toBe(false);
  });
});

// --- Item count (quantity) display ---

describe('Quantity accumulation', () => {
  it('sums fractional quantities without precision loss', () => {
    // Raw JS: 1.1 + 0.3 + 0.5 = 1.9000000000000001
    const rawSum = 1.1 + 0.3 + 0.5;
    expect(rawSum).not.toBe(1.9);

    expect(sumQuantity([1.1, 0.3, 0.5])).toBe(1.9);
  });

  it('rounds quantities to 3 decimals before pricing weighted products', () => {
    const quantity = roundQuantity(0.3125);
    expect(quantity).toBe(0.313);
    expect(multiplyMoney(80, quantity)).toBe(25.04);
  });

  it('keeps quantity comparisons aligned with normalized stock values', () => {
    expect(hasSufficientStock(5.1, 4.8)).toBe(true);
    expect(hasSufficientStock(0.3124, 0.3125)).toBe(false);
  });

  it('displays total items with 3-decimal normalization', () => {
    expect(sumQuantity([1.5, 0.333])).toBe(1.833);
  });
});
