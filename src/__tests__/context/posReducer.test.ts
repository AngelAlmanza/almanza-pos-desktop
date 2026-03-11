import { describe, it, expect } from 'vitest';
import { posReducer } from '../../context/PosProvider';
import type { CartItem, Product } from '../../models';

// Helper to build a minimal valid Product
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Test Product',
    description: null,
    barcode: null,
    price: 10.0,
    unit: 'pieza',
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

describe('posReducer – ADD_ITEM', () => {
  it('adds a new product to the empty cart', () => {
    const product = makeProduct({ price: 10.0, stock: 5 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 1 },
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
      payload: { product, quantity: 3 },
    });
    expect(state.cart[0].subtotal).toBe(59.97);
  });

  it('calculates subtotal with small unit price', () => {
    // Raw JS: 0.10 * 3 = 0.30000000000000004
    const product = makeProduct({ price: 0.10, stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 3 },
    });

    expect(0.10 * 3).not.toBe(0.30); // prove the raw float problem
    expect(state.cart[0].subtotal).toBe(0.30);
  });

  it('handles fractional quantities (kg/liters)', () => {
    // $89.50/kg * 1.5 kg = $134.25
    const product = makeProduct({ price: 89.50, unit: 'kg', stock: 10 });
    const state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 1.5 },
    });

    expect(state.cart[0].subtotal).toBe(134.25);
  });

  it('accumulates quantity when the same product is added again', () => {
    const product = makeProduct({ price: 9.99, stock: 20 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 2 },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 3 },
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
      payload: { product, quantity: 5 },
    });

    expect(state.cart).toHaveLength(0);
  });

  it('does not add more units when accumulated quantity would exceed stock', () => {
    const product = makeProduct({ price: 10.0, stock: 3 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 2 },
    });
    // Second ADD_ITEM would make qty=4 which exceeds stock=3; state stays unchanged
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 2 },
    });

    expect(state.cart[0].quantity).toBe(2);
  });

  it('adds different products as separate cart items', () => {
    const p1 = makeProduct({ id: 1, price: 10.0, stock: 5 });
    const p2 = makeProduct({ id: 2, price: 20.0, stock: 5 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product: p1, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product: p2, quantity: 2 },
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
      payload: { product, quantity: 7 },
    });

    expect(state.cart[0].subtotal).toBe(69.93);
  });
});

describe('posReducer – INCREMENT', () => {
  it('increments quantity and recalculates subtotal', () => {
    const product = makeProduct({ price: 19.99, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'INCREMENT',
      payload: { productId: product.id, delta: 1 },
    });

    expect(state.cart[0].quantity).toBe(2);
    // 19.99 * 2 = 39.98
    expect(state.cart[0].subtotal).toBe(39.98);
  });

  it('removes item from cart when quantity reaches 0', () => {
    const product = makeProduct({ price: 10.0, stock: 5 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'INCREMENT',
      payload: { productId: product.id, delta: -1 },
    });

    expect(state.cart).toHaveLength(0);
  });

  it('accumulates fractional increments without precision loss', () => {
    // Raw JS: 0.1 + 0.2 = 0.30000000000000004 — Decimal.js must give 0.3
    const product = makeProduct({ price: 10.0, stock: 10 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 0.1 },
    });
    state = posReducer(state, {
      type: 'INCREMENT',
      payload: { productId: product.id, delta: 0.2 },
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
      payload: { product, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'SET_QUANTITY',
      payload: { productId: product.id, quantity: 7 },
    });

    expect(state.cart[0].quantity).toBe(7);
    expect(state.cart[0].subtotal).toBe(69.93);
  });

  it('removes item from cart when quantity is set to 0', () => {
    const product = makeProduct({ price: 10.0, stock: 5 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 2 },
    });
    state = posReducer(state, {
      type: 'SET_QUANTITY',
      payload: { productId: product.id, quantity: 0 },
    });

    expect(state.cart).toHaveLength(0);
  });
});

describe('posReducer – REMOVE_ITEM', () => {
  it('removes the specified product from the cart', () => {
    const product = makeProduct();
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'REMOVE_ITEM',
      payload: { productId: product.id },
    });

    expect(state.cart).toHaveLength(0);
  });

  it('only removes the target product, leaving others intact', () => {
    const p1 = makeProduct({ id: 1 });
    const p2 = makeProduct({ id: 2, price: 20.0 });
    let state = posReducer(emptyState, {
      type: 'ADD_ITEM',
      payload: { product: p1, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product: p2, quantity: 1 },
    });
    state = posReducer(state, {
      type: 'REMOVE_ITEM',
      payload: { productId: p1.id },
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
      payload: { product: p1, quantity: 2 },
    });
    state = posReducer(state, {
      type: 'ADD_ITEM',
      payload: { product: p2, quantity: 3 },
    });
    state = posReducer(state, { type: 'CLEAR_CART' });

    expect(state.cart).toHaveLength(0);
  });

  it('is idempotent on an already empty cart', () => {
    const state = posReducer(emptyState, { type: 'CLEAR_CART' });
    expect(state.cart).toHaveLength(0);
  });
});
