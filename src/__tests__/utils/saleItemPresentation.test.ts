import { describe, expect, it } from 'vitest';
import {
  getBaseEquivalentLabel,
  getBasePriceLabel,
  getPurchaseLabel,
  type SaleItemPresentationData,
} from '../../utils/saleItemPresentation';

function makeItem(overrides: Partial<SaleItemPresentationData> = {}): SaleItemPresentationData {
  return {
    quantity: 0.2,
    base_unit: 'kg',
    input_mode: 'sub',
    input_value: 200,
    input_unit: 'g',
    unit_price: 100,
    subtotal: 20,
    ...overrides,
  };
}

describe('sale item presentation', () => {
  it('shows the captured subunit and base price', () => {
    const item = makeItem();
    expect(getPurchaseLabel(item)).toBe('200 g');
    expect(getBaseEquivalentLabel(item)).toBeNull();
    expect(getBasePriceLabel(item)).toContain('$100.00/kg');
  });

  it('shows amount input together with its base equivalent', () => {
    const item = makeItem({
      input_mode: 'amount',
      input_value: 20,
      input_unit: 'MXN',
    });
    expect(getPurchaseLabel(item)).toContain('$20.00');
    expect(getBaseEquivalentLabel(item)).toBe('0.2 kg');
  });

  it('labels legacy sale items without inventing a historical unit', () => {
    const item = makeItem({
      base_unit: null,
      input_mode: null,
      input_value: null,
      input_unit: null,
    });
    expect(getPurchaseLabel(item)).toBe('0.2 · Unidad no registrada');
    expect(getBasePriceLabel(item)).toContain('Unidad no registrada');
  });
});
