/**
 * Tests for the Decimal.js-based payment calculations that mirror the logic
 * in POSPage.tsx. These cover floating-point precision in: totals, USD↔MXN
 * conversion, mixed payments, and change calculation.
 */
import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';

// --- Helpers that mirror POSPage.tsx logic ---

function cartTotal(subtotals: number[]): Decimal {
  return subtotals.reduce((sum, s) => sum.plus(s), new Decimal(0));
}

function usdToMxn(usd: Decimal, exchangeRate: Decimal): Decimal {
  return usd.times(exchangeRate);
}

function totalPaid(
  mxn: Decimal,
  usd: Decimal,
  transfer: Decimal,
  exchangeRate: Decimal | null,
): Decimal {
  const usdInMxn = exchangeRate ? usdToMxn(usd, exchangeRate) : usd;
  return mxn.plus(usdInMxn).plus(transfer);
}

function changeAmount(total: Decimal, paid: Decimal): Decimal {
  return paid.minus(total);
}

// --- Cart total ---

describe('Cart total calculation', () => {
  it('sums subtotals without floating point drift', () => {
    // Prove that raw JS float addition drifts (canonical example):
    expect(0.1 + 0.2).not.toBe(0.3);

    // Decimal.js-based total computes correctly even with decimal prices:
    const total = cartTotal([19.99, 9.99, 4.99]);
    expect(total.toNumber()).toBe(34.97);
  });

  it('handles a single item', () => {
    expect(cartTotal([89.50]).toNumber()).toBe(89.50);
  });

  it('returns zero for an empty cart', () => {
    expect(cartTotal([]).toNumber()).toBe(0);
  });

  it('sums many small amounts without accumulation error', () => {
    // 10 items at $0.10 each → $1.00 exactly
    const subtotals = Array(10).fill(0.10);
    const total = cartTotal(subtotals);
    expect(total.toNumber()).toBe(1.00);
  });

  it('handles amounts with repeating decimals', () => {
    // 3 items at $33.33 → $99.99 (raw: 99.99000000000001)
    const total = cartTotal([33.33, 33.33, 33.33]);
    expect(total.toNumber()).toBe(99.99);
  });
});

// --- USD to MXN conversion ---

describe('USD to MXN conversion', () => {
  it('converts whole USD amounts at a round exchange rate', () => {
    const mxn = usdToMxn(new Decimal(10), new Decimal(20));
    expect(mxn.toNumber()).toBe(200);
  });

  it('converts whole USD at a fractional exchange rate', () => {
    // $10 USD × 17.35 = $173.50 MXN
    const mxn = usdToMxn(new Decimal(10), new Decimal(17.35));
    expect(mxn.toNumber()).toBe(173.50);
  });

  it('converts fractional USD amount', () => {
    // $5.50 USD × 17.35 = $95.425 → kept as-is by Decimal (no rounding here)
    const mxn = usdToMxn(new Decimal('5.50'), new Decimal('17.35'));
    expect(mxn.toFixed(3)).toBe('95.425');
  });

  it('handles zero USD', () => {
    const mxn = usdToMxn(new Decimal(0), new Decimal(17.50));
    expect(mxn.toNumber()).toBe(0);
  });

  it('converts total to USD for display without precision drift', () => {
    // $200 MXN ÷ 17.50 = $11.428... USD → displayed as $11.43
    const total = new Decimal(200);
    const rate = new Decimal(17.50);
    expect(total.div(rate).toFixed(2)).toBe('11.43');
  });
});

// --- Payment totals (mixed methods) ---

describe('Mixed payment totalPaid calculation', () => {
  const rate = new Decimal(17.50);

  it('cash MXN only', () => {
    const paid = totalPaid(new Decimal(150), new Decimal(0), new Decimal(0), rate);
    expect(paid.toNumber()).toBe(150);
  });

  it('cash USD only (converts to MXN)', () => {
    // $5 USD × 17.50 = $87.50 MXN
    const paid = totalPaid(new Decimal(0), new Decimal(5), new Decimal(0), rate);
    expect(paid.toNumber()).toBe(87.50);
  });

  it('transfer only', () => {
    const paid = totalPaid(new Decimal(0), new Decimal(0), new Decimal(200), rate);
    expect(paid.toNumber()).toBe(200);
  });

  it('cash MXN + transfer', () => {
    // $100 + $50 = $150
    const paid = totalPaid(new Decimal(100), new Decimal(0), new Decimal(50), rate);
    expect(paid.toNumber()).toBe(150);
  });

  it('all three methods combined', () => {
    // $50 MXN + ($2 USD × 17.50 = $35 MXN) + $25 transfer = $110 MXN
    const paid = totalPaid(new Decimal(50), new Decimal(2), new Decimal(25), rate);
    expect(paid.toNumber()).toBe(110);
  });

  it('accumulates fractional amounts without precision loss', () => {
    // $89.99 MXN + $0 USD + $10.01 transfer = $100 exactly
    const paid = totalPaid(
      new Decimal('89.99'),
      new Decimal(0),
      new Decimal('10.01'),
      rate,
    );
    expect(paid.toNumber()).toBe(100);
  });

  it('works without an exchange rate (USD treated as MXN 1:1)', () => {
    const paid = totalPaid(new Decimal(50), new Decimal(10), new Decimal(0), null);
    expect(paid.toNumber()).toBe(60);
  });
});

// --- Change calculation ---

describe('Change (cambio) calculation', () => {
  it('returns zero when payment is exact', () => {
    const change = changeAmount(new Decimal(100), new Decimal(100));
    expect(change.toNumber()).toBe(0);
  });

  it('returns positive change when customer overpays', () => {
    // Pay $200 for a $150 item
    const change = changeAmount(new Decimal(150), new Decimal(200));
    expect(change.toNumber()).toBe(50);
  });

  it('calculates change without floating point error', () => {
    // Raw JS: 100 - 89.99 = 10.010000000000001
    const rawChange = 100 - 89.99;
    expect(rawChange).not.toBe(10.01); // prove the raw problem

    const change = changeAmount(new Decimal('89.99'), new Decimal(100));
    expect(change.toFixed(2)).toBe('10.01');
  });

  it('handles one-cent difference correctly', () => {
    // Pay $1.00 for a $0.99 item → $0.01 change
    const change = changeAmount(new Decimal('0.99'), new Decimal('1.00'));
    expect(change.toFixed(2)).toBe('0.01');
  });

  it('detects negative change (underpayment)', () => {
    const change = changeAmount(new Decimal(150), new Decimal(100));
    expect(change.isNegative()).toBe(true);
    expect(change.toNumber()).toBe(-50);
  });

  it('detects sufficient payment with gte', () => {
    const total = new Decimal(89.99);
    expect(new Decimal(100).gte(total)).toBe(true);
    expect(new Decimal(89.99).gte(total)).toBe(true);
    expect(new Decimal(89.98).gte(total)).toBe(false);
  });
});

// --- Item count (quantity) display ---

describe('Quantity accumulation', () => {
  it('sums fractional quantities without precision loss', () => {
    // Raw JS: 1.1 + 0.3 + 0.5 = 1.9000000000000001
    const rawSum = 1.1 + 0.3 + 0.5;
    expect(rawSum).not.toBe(1.9);

    const quantities = [1.1, 0.3, 0.5];
    const total = quantities.reduce((sum, q) => sum.plus(q), new Decimal(0));
    expect(total.toNumber()).toBe(1.9);
  });

  it('displays total items with toDecimalPlaces(3)', () => {
    const total = new Decimal('1.5').plus('0.333');
    expect(total.toDecimalPlaces(3).toString()).toBe('1.833');
  });
});
