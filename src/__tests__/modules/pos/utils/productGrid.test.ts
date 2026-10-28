import { describe, expect, it } from 'vitest';
import type { Product } from '@modules/catalog/products/types';
import {
  UNCATEGORIZED_LABEL,
  compareNames,
  gridReducer,
  groupProducts,
  initialGridState,
  normalizeGridTerm,
  sortProducts,
} from '@modules/pos/utils/productGrid';
import type { GridState } from '@modules/pos/utils/productGrid';

function product(overrides: Partial<Product> & { id: number }): Product {
  return {
    name: `Producto ${overrides.id}`,
    description: null,
    barcode: null,
    price: 10,
    unit: 'pieza',
    is_bulk: false,
    category_id: null,
    category_name: null,
    stock: 5,
    min_stock: 0,
    active: true,
    created_at: '',
    updated_at: '',
    image_file: null,
    ...overrides,
  };
}

const names = (products: Product[]) => products.map((p) => p.name);

describe('compareNames', () => {
  it('ignora acentos y mayúsculas', () => {
    expect(compareNames('Árbol', 'arbol')).toBe(0);
    expect(compareNames('Álamo', 'Banana')).toBeLessThan(0);
    expect(compareNames('zeta', 'Ábaco')).toBeGreaterThan(0);
  });
});

describe('groupProducts', () => {
  it('ordena los grupos alfabéticamente sin distinguir acentos ni mayúsculas', () => {
    const groups = groupProducts([
      product({ id: 1, category_id: 1, category_name: 'lácteos' }),
      product({ id: 2, category_id: 2, category_name: 'Abarrotes' }),
      product({ id: 3, category_id: 3, category_name: 'Bebidas' }),
      product({ id: 4, category_id: 4, category_name: 'Épicos' }),
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Abarrotes', 'Bebidas', 'Épicos', 'lácteos']);
  });

  it('coloca "Sin categoría" al final aunque llegue primero (AC2.2)', () => {
    const groups = groupProducts([
      product({ id: 1, category_id: null }),
      product({ id: 2, category_id: 9, category_name: 'Zumos' }),
      product({ id: 3, category_id: 8, category_name: 'Abarrotes' }),
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Abarrotes', 'Zumos', UNCATEGORIZED_LABEL]);
    expect(groups[2].key).toBe('none');
    expect(groups[2].categoryId).toBeNull();
  });

  it('agrupa por category_id y cuenta los productos de cada grupo', () => {
    const groups = groupProducts([
      product({ id: 1, category_id: 1, category_name: 'Bebidas' }),
      product({ id: 2, category_id: 1, category_name: 'Bebidas' }),
      product({ id: 3, category_id: 2, category_name: 'Botanas' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].products.map((p) => p.id)).toEqual([1, 2]);
    expect(groups[1].products).toHaveLength(1);
  });

  it('dos categorías con el mismo nombre y distinto id forman grupos distintos', () => {
    const groups = groupProducts([
      product({ id: 1, category_id: 1, category_name: 'Varios' }),
      product({ id: 2, category_id: 2, category_name: 'Varios' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.key)).toEqual(['cat-1', 'cat-2']);
  });

  it('no genera grupos vacíos: sin productos no hay grupos (AC2.4)', () => {
    expect(groupProducts([])).toEqual([]);
    expect(groupProducts([product({ id: 1, category_id: null })]).map((g) => g.name)).toEqual([UNCATEGORIZED_LABEL]);
  });

  it('conserva el orden de entrada dentro del grupo', () => {
    const groups = groupProducts([
      product({ id: 3, category_id: 1, category_name: 'A' }),
      product({ id: 1, category_id: 1, category_name: 'A' }),
    ]);
    expect(groups[0].products.map((p) => p.id)).toEqual([3, 1]);
  });
});

describe('sortProducts', () => {
  const list = [
    product({ id: 1, name: 'Zarzamora', price: 10.0, stock: 3 }),
    product({ id: 2, name: 'Ámbar', price: 25.5, stock: 20 }),
    product({ id: 3, name: 'Mango', price: 8.0, stock: 0 }),
  ];

  it('ordena por nombre ascendente con acentos (AC2.3)', () => {
    expect(names(sortProducts(list, 'name', 'asc'))).toEqual(['Ámbar', 'Mango', 'Zarzamora']);
  });

  it('ordena por nombre descendente', () => {
    expect(names(sortProducts(list, 'name', 'desc'))).toEqual(['Zarzamora', 'Mango', 'Ámbar']);
  });

  it('ordena por precio descendente: 25.50, 10.00, 8.00 (AC2.3)', () => {
    expect(sortProducts(list, 'price', 'desc').map((p) => p.price)).toEqual([25.5, 10, 8]);
  });

  it('ordena por precio ascendente', () => {
    expect(sortProducts(list, 'price', 'asc').map((p) => p.price)).toEqual([8, 10, 25.5]);
  });

  it('ordena por stock ascendente', () => {
    expect(sortProducts(list, 'stock', 'asc').map((p) => p.stock)).toEqual([0, 3, 20]);
  });

  it('desempata por nombre ascendente aunque el orden sea descendente', () => {
    const tied = [
      product({ id: 1, name: 'Beta', price: 5 }),
      product({ id: 2, name: 'alfa', price: 5 }),
      product({ id: 3, name: 'Gama', price: 9 }),
    ];
    expect(names(sortProducts(tied, 'price', 'desc'))).toEqual(['Gama', 'alfa', 'Beta']);
  });

  it('desempata por id cuando el nombre normalizado coincide', () => {
    const tied = [
      product({ id: 9, name: 'Árbol', price: 5 }),
      product({ id: 4, name: 'arbol', price: 5 }),
    ];
    expect(sortProducts(tied, 'price', 'asc').map((p) => p.id)).toEqual([4, 9]);
  });

  it('no modifica la lista recibida', () => {
    const original = names(list);
    sortProducts(list, 'price', 'desc');
    expect(names(list)).toEqual(original);
  });
});

describe('gridReducer', () => {
  const two = [product({ id: 1 }), product({ id: 2 })];

  function loaded(term = ''): GridState {
    const requested = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term });
    return gridReducer(requested, { type: 'response', seq: 1, products: two });
  }

  it('primera carga: loading y luego populated con la respuesta vigente', () => {
    const requested = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: '' });
    expect(requested.status).toBe('loading');
    const done = gridReducer(requested, { type: 'response', seq: 1, products: two });
    expect(done.status).toBe('populated');
    expect(done.products).toHaveLength(2);
  });

  it('catálogo vacío sin texto: empty-catalog', () => {
    const requested = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: '' });
    expect(gridReducer(requested, { type: 'response', seq: 1, products: [] }).status).toBe('empty-catalog');
  });

  it('sin resultados con texto: empty-filter y conserva el texto recortado (AC2.8)', () => {
    const requested = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: '  xyz ' });
    const done = gridReducer(requested, { type: 'response', seq: 1, products: [] });
    expect(done.status).toBe('empty-filter');
    expect(done.term).toBe('xyz');
  });

  it('un texto de solo espacios equivale a vacío', () => {
    expect(normalizeGridTerm('   ')).toBe('');
    const requested = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: '   ' });
    const done = gridReducer(requested, { type: 'response', seq: 1, products: [] });
    expect(done.status).toBe('empty-catalog');
  });

  it('descarta una respuesta vieja de un filtro anterior (G3)', () => {
    let state = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: 'le' });
    state = gridReducer(state, { type: 'load-requested', seq: 2, term: 'leche' });
    const afterOld = gridReducer(state, { type: 'response', seq: 1, products: two });
    expect(afterOld).toBe(state);
    expect(afterOld.status).toBe('loading');
    const afterCurrent = gridReducer(afterOld, { type: 'response', seq: 2, products: [two[0]] });
    expect(afterCurrent.products).toHaveLength(1);
  });

  it('una recarga con datos previos pasa a refreshing y conserva las tarjetas (AC2.9)', () => {
    const refreshing = gridReducer(loaded(), { type: 'load-requested', seq: 2, term: '' });
    expect(refreshing.status).toBe('refreshing');
    expect(refreshing.products).toHaveLength(2);
    const fresh = gridReducer(refreshing, { type: 'response', seq: 2, products: [product({ id: 1, stock: 1 })] });
    expect(fresh.status).toBe('populated');
    expect(fresh.products[0].stock).toBe(1);
  });

  it('una recarga fallida con datos previos pasa a stale y conserva las tarjetas (AC2.9)', () => {
    const refreshing = gridReducer(loaded(), { type: 'load-requested', seq: 2, term: '' });
    const stale = gridReducer(refreshing, { type: 'failed', seq: 2, message: 'fallo' });
    expect(stale.status).toBe('stale');
    expect(stale.products).toHaveLength(2);
    expect(stale.errorMessage).toBe('fallo');
    // Reintentar vuelve a refreshing.
    expect(gridReducer(stale, { type: 'load-requested', seq: 3, term: '' }).status).toBe('refreshing');
  });

  it('un fallo sin datos previos pasa a error y reintentar vuelve a loading', () => {
    const requested = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: '' });
    const failed = gridReducer(requested, { type: 'failed', seq: 1, message: 'sin base' });
    expect(failed.status).toBe('error');
    expect(gridReducer(failed, { type: 'load-requested', seq: 2, term: '' }).status).toBe('loading');
  });

  it('descarta un fallo de una consulta vieja', () => {
    let state = gridReducer(initialGridState, { type: 'load-requested', seq: 1, term: 'a' });
    state = gridReducer(state, { type: 'load-requested', seq: 2, term: 'ab' });
    expect(gridReducer(state, { type: 'failed', seq: 1, message: 'viejo' })).toBe(state);
  });
});
