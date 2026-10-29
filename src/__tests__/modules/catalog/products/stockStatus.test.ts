import { describe, expect, it } from 'vitest';
import type { Product } from '@modules/catalog/products/types';
import {
  compareProductsByName,
  countByCategory,
  filterProducts,
  getStockStatus,
  summarizeStock,
} from '@modules/catalog/products/utils/stockStatus';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Leche',
    description: null,
    barcode: null,
    price: 10,
    unit: 'pieza',
    is_bulk: false,
    category_id: null,
    category_name: null,
    stock: 10,
    min_stock: 5,
    active: true,
    created_at: '',
    updated_at: '',
    image_file: null,
    ...overrides,
  };
}

describe('getStockStatus', () => {
  it('marks stock above the minimum as normal', () => {
    expect(getStockStatus(makeProduct({ stock: 10, min_stock: 5 }))).toBe('normal');
  });

  it('marks stock equal to the minimum as low (regression)', () => {
    expect(getStockStatus(makeProduct({ stock: 5, min_stock: 5 }))).toBe('low');
  });

  it('marks 5.001 with minimum 5 as normal (regression)', () => {
    expect(getStockStatus(makeProduct({ stock: 5.001, min_stock: 5, is_bulk: true }))).toBe(
      'normal',
    );
  });

  it('marks stock 0 with minimum 0 as out (regression)', () => {
    expect(getStockStatus(makeProduct({ stock: 0, min_stock: 0 }))).toBe('out');
  });

  it('marks negative stock as out and inactive products as having no status', () => {
    expect(getStockStatus(makeProduct({ stock: -2 }))).toBe('out');
    expect(getStockStatus(makeProduct({ stock: 0, active: false }))).toBeNull();
  });
});

describe('summarizeStock and filterProducts', () => {
  const products: Product[] = [
    makeProduct({ id: 1, category_id: 1, stock: 3 }),
    makeProduct({ id: 2, category_id: 1, stock: 20 }),
    makeProduct({ id: 3, category_id: null, stock: 0 }),
    makeProduct({ id: 4, category_id: 2, stock: 0, active: false }),
  ];

  it('counts only active products', () => {
    expect(summarizeStock(products)).toEqual({ active: 3, low: 1, out: 1 });
  });

  it('combines category, status and inactive filters', () => {
    const base = { category: 'all', status: 'all', showInactive: false } as const;
    expect(filterProducts(products, base).map((p) => p.id)).toEqual([1, 2, 3]);
    expect(filterProducts(products, { ...base, showInactive: true })).toHaveLength(4);
    expect(filterProducts(products, { ...base, category: 1, status: 'low' }).map((p) => p.id)).toEqual([1]);
    expect(filterProducts(products, { ...base, category: 'none' }).map((p) => p.id)).toEqual([3]);
  });

  it('counts products per category, including none', () => {
    expect(countByCategory(products, false)).toEqual({ all: 3, none: 1, '1': 2 });
    expect(countByCategory(products, true)).toMatchObject({ all: 4, '2': 1 });
  });
});

describe('compareProductsByName', () => {
  it('ignores case and accents, and breaks ties by id', () => {
    const list = [
      makeProduct({ id: 3, name: 'zanahoria' }),
      makeProduct({ id: 2, name: 'Árbol' }),
      makeProduct({ id: 1, name: 'arbol' }),
    ];
    expect(list.sort(compareProductsByName).map((p) => p.id)).toEqual([1, 2, 3]);
  });
});
