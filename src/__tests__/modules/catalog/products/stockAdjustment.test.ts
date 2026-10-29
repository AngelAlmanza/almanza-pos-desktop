import { describe, expect, it } from 'vitest';
import {
  ADJUSTMENT_LABELS,
  previewAdjustment,
  validateAdjustmentQuantity,
} from '@modules/catalog/products/utils/stockAdjustment';

describe('ADJUSTMENT_LABELS', () => {
  it('maps the three types to plain names', () => {
    expect(ADJUSTMENT_LABELS.add).toBe('Llegó mercancía');
    expect(ADJUSTMENT_LABELS.positive).toBe('Sobró al contar');
    expect(ADJUSTMENT_LABELS.negative).toBe('Faltó al contar');
  });
});

describe('previewAdjustment', () => {
  it('adds for add and positive', () => {
    expect(previewAdjustment(2, 'add', 10)).toEqual({ current: 2, resulting: 12 });
    expect(previewAdjustment(2, 'positive', 1)).toEqual({ current: 2, resulting: 3 });
  });

  it('subtracts for negative with 3 decimal precision (1.250 - 0.250 = 1.000)', () => {
    expect(previewAdjustment(1.25, 'negative', 0.25)).toEqual({ current: 1.25, resulting: 1 });
  });

  it('does not drift with floating point values', () => {
    expect(previewAdjustment(0.1, 'add', 0.2).resulting).toBe(0.3);
  });

  it('shows a negative result as is', () => {
    expect(previewAdjustment(1, 'negative', 3).resulting).toBe(-2);
  });
});

describe('validateAdjustmentQuantity', () => {
  const piece = { is_bulk: false };
  const bulk = { is_bulk: true };

  it('rejects empty, zero and negative quantities', () => {
    for (const input of ['', '0', '-1', 'abc']) {
      const result = validateAdjustmentQuantity(input, piece);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('La cantidad debe ser mayor que 0');
    }
  });

  it('requires whole numbers for piece products', () => {
    const result = validateAdjustmentQuantity('1.5', piece);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('números enteros');
    expect(validateAdjustmentQuantity('4', piece)).toEqual({ valid: true, value: 4, error: null });
  });

  it('accepts up to 3 decimals for bulk products', () => {
    expect(validateAdjustmentQuantity('0.250', bulk).value).toBe(0.25);
    expect(validateAdjustmentQuantity('0.2501', bulk).valid).toBe(false);
  });
});
