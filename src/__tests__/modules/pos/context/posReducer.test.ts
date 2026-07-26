import { describe, it, expect } from 'vitest';
import { posReducer } from '@modules/pos/context/PosProvider';
import type { CartItem } from '@modules/pos/types';
import type { Product } from '@modules/catalog/products/types';
import type { SaleInputMode } from '@modules/shared/types/base';
import { buildQuantitySelection } from '@modules/shared/utils/unitConversion';

// Helper to build a minimal valid Product
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Test Product',
    description: null,
    barcode: null,
    price: 10.0,
    unit: 'pieza',
    is_bulk: false,
    category_id: null,
    category_name: null,
    stock: 100,
    min_stock: 5,
    active: true,
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    ...overrides,
  };
}

const emptyState: { cart: CartItem[] } = { cart: [] };

function selection(
  product: Product,
  inputValue: number,
  inputMode: SaleInputMode = 'base',
  inputUnit: string = product.unit,
) {
  return buildQuantitySelection({
    input_mode: inputMode,
    input_value: inputValue,
    input_unit: inputUnit,
  }, product);
}

describe('posReducer – ADD_ITEM', () => {
  it('adds a new product to the empty cart', () => {
    const product = makeProduct({ price: 10.0, stock: 5 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 1) },
    });

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(1);
    expect(state.cart[0].subtotal).toBe(10.0);
  });

  it('calculates subtotal with decimal price without floating point drift', () => {
    // Prove that raw JS float multiplication drifts (canonical example):
    expect(0.1 * 3).not.toBe(0.30);

    // Decimal.js computes 19.99 * 3 exactly:
    const product = makeProduct({ price: 19.99, stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 3) },
    });
    expect(state.cart[0].subtotal).toBe(59.97);
  });

  it('calculates subtotal with small unit price', () => {
    // Raw JS: 0.10 * 3 = 0.30000000000000004
    const product = makeProduct({ price: 0.10, stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 3) },
    });

    expect(0.10 * 3).not.toBe(0.30); // prove the raw float problem
    expect(state.cart[0].subtotal).toBe(0.30);
  });

  it('handles fractional quantities (kg/liters)', () => {
    // $89.50/kg * 1.5 kg = $134.25
    const product = makeProduct({ price: 89.50, unit: 'kg', is_bulk: true, stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 1.5) },
    });

    expect(state.cart[0].subtotal).toBe(134.25);
  });

  it('rounds weighted quantities to 3 decimals before calculating subtotal', () => {
    const product = makeProduct({ price: 80, unit: 'kg', is_bulk: true, stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 0.3125) },
    });

    expect(state.cart[0].quantity).toBe(0.313);
    expect(state.cart[0].subtotal).toBe(25.04);
  });

  it('accumulates quantity when the same product is added again', () => {
    const product = makeProduct({ price: 9.99, stock: 20 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 2) },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 3) },
    });

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(5);
    // 9.99 * 5 = 49.95 (would be 49.949999999999996 without Decimal.js)
    expect(state.cart[0].subtotal).toBe(49.95);
  });

  it('does not add a new item when requested quantity exceeds stock', () => {
    const product = makeProduct({ price: 10.0, stock: 3 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 5) },
    });

    expect(state.cart).toHaveLength(0);
  });

  it('does not add more units when accumulated quantity would exceed stock', () => {
    const product = makeProduct({ price: 10.0, stock: 3 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 2) },
    });
    // Second ADD_ITEM would make qty=4 which exceeds stock=3; state stays unchanged
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 2) },
    });

    expect(state.cart[0].quantity).toBe(2);
  });

  it('adds different products as separate cart items', () => {
    const p1 = makeProduct({ id: 1, price: 10.0, stock: 5 });
    const p2 = makeProduct({ id: 2, price: 20.0, stock: 5 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product: p1, selection: selection(p1, 1) },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product: p2, selection: selection(p2, 2) },
    });

    expect(state.cart).toHaveLength(2);
    expect(state.cart[0].subtotal).toBe(10.0);
    expect(state.cart[1].subtotal).toBe(40.0);
  });

  it('calculates subtotal for 7 units of $9.99', () => {
    // 9.99 * 7 = 69.93 (raw float: 69.93000000000001)
    const product = makeProduct({ price: 9.99, stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 7) },
    });

    expect(state.cart[0].subtotal).toBe(69.93);
  });

  it('combines the same product only when mode and input unit match', () => {
    const product = makeProduct({ price: 100, unit: 'kg', is_bulk: true, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 200, 'sub', 'g') },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 300, 'sub', 'g') },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 0.5, 'base', 'kg') },
    });

    expect(state.cart).toHaveLength(2);
    expect(state.cart[0]).toMatchObject({
      input_mode: 'sub',
      input_value: 500,
      input_unit: 'g',
      quantity: 0.5,
      subtotal: 50,
    });
    expect(state.cart[1]).toMatchObject({
      input_mode: 'base',
      input_value: 0.5,
      input_unit: 'kg',
      quantity: 0.5,
      subtotal: 50,
    });
  });

  it('recalculates combined amount entries from their accumulated captured value', () => {
    const product = makeProduct({ price: 80, unit: 'kg', is_bulk: true, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 25, 'amount', 'MXN') },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 25, 'amount', 'MXN') },
    });

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0]).toMatchObject({
      input_value: 50,
      input_unit: 'MXN',
      quantity: 0.625,
      subtotal: 50,
    });
  });

  it('checks stock using the recomputed combined input instead of summed rounded lines', () => {
    const product = makeProduct({ price: 100, unit: 'kg', is_bulk: true, stock: 0.667 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 333.5, 'sub', 'g') },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 333.5, 'sub', 'g') },
    });

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].input_value).toBe(667);
    expect(state.cart[0].quantity).toBe(0.667);
  });

  it('checks stock across separate lines of the same product', () => {
    const product = makeProduct({ price: 100, unit: 'kg', is_bulk: true, stock: 0.6 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 200, 'sub', 'g') },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 0.5, 'base', 'kg') },
    });

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(0.2);
  });
});

describe('posReducer – INCREMENT', () => {
  it('increments quantity and recalculates subtotal', () => {
    const product = makeProduct({ price: 19.99, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 1) },
    });
    state = posReducer(state, {
      type: 'INCREMENT',
      payload: { lineKey: state.cart[0].line_key, delta: 1 },
    });

    expect(state.cart[0].quantity).toBe(2);
    // 19.99 * 2 = 39.98
    expect(state.cart[0].subtotal).toBe(39.98);
  });

  it('removes item from cart when quantity reaches 0', () => {
    const product = makeProduct({ price: 10.0, stock: 5 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 1) },
    });
    state = posReducer(state, {
      type: 'INCREMENT',
      payload: { lineKey: state.cart[0].line_key, delta: -1 },
    });

    expect(state.cart).toHaveLength(0);
  });

  it('accumulates fractional increments without precision loss', () => {
    // Raw JS: 0.1 + 0.2 = 0.30000000000000004 — Decimal.js must give 0.3
    const product = makeProduct({ price: 10.0, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 0.1) },
    });
    state = posReducer(state, {
      type: 'INCREMENT',
      payload: { lineKey: state.cart[0].line_key, delta: 0.2 },
    });

    expect(0.1 + 0.2).not.toBe(0.3); // prove the raw float problem
    expect(state.cart[0].quantity).toBe(0.3);
  });
});

describe('posReducer – SET_QUANTITY', () => {
  it('updates quantity and recalculates subtotal', () => {
    const product = makeProduct({ price: 9.99, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 1) },
    });
    state = posReducer(state, {
      type: 'SET_QUANTITY',
      payload: { lineKey: state.cart[0].line_key, quantity: 7 },
    });

    expect(state.cart[0].quantity).toBe(7);
    expect(state.cart[0].subtotal).toBe(69.93);
  });

  it('removes item from cart when quantity is set to 0', () => {
    const product = makeProduct({ price: 10.0, stock: 5 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 2) },
    });
    state = posReducer(state, {
      type: 'SET_QUANTITY',
      payload: { lineKey: state.cart[0].line_key, quantity: 0 },
    });

    expect(state.cart).toHaveLength(0);
  });
});

describe('posReducer – REMOVE_ITEM', () => {
  it('removes the specified product from the cart', () => {
    const product = makeProduct();
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, selection: selection(product, 1) },
    });
    state = posReducer(state, {
      type: 'REMOVE_ITEM',
      payload: { lineKey: state.cart[0].line_key },
    });

    expect(state.cart).toHaveLength(0);
  });

  it('only removes the target product, leaving others intact', () => {
    const p1 = makeProduct({ id: 1 });
    const p2 = makeProduct({ id: 2, price: 20.0 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product: p1, selection: selection(p1, 1) },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product: p2, selection: selection(p2, 1) },
    });
    state = posReducer(state, {
      type: 'REMOVE_ITEM',
      payload: { lineKey: state.cart.find((item) => item.product.id === p1.id)!.line_key },
    });

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].product.id).toBe(p2.id);
  });
});

describe('posReducer – CLEAR_CART', () => {
  it('empties all items from the cart', () => {
    const p1 = makeProduct({ id: 1 });
    const p2 = makeProduct({ id: 2, price: 20.0 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product: p1, selection: selection(p1, 2) },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product: p2, selection: selection(p2, 3) },
    });
    state = posReducer(state, { type: 'CLEAR_CART' });

    expect(state.cart).toHaveLength(0);
  });

  it('is idempotent on an already empty cart', () => {
    const state = posReducer(emptyState, { type: 'CLEAR_CART' });
    expect(state.cart).toHaveLength(0);
  });
});
