import type { Product } from '@modules/catalog/products/types';

/** Espera sin teclear antes de filtrar la cuadrícula (G2). */
export const GRID_DEBOUNCE_MS = 100;

/** Nombre del grupo de productos sin categoría (G4). */
export const UNCATEGORIZED_LABEL = 'Sin categoría';

export type GridSortKey = 'name' | 'price' | 'stock';
export type GridSortDirection = 'asc' | 'desc';

export interface ProductGroup {
  /** `none` para "Sin categoría"; `cat-<id>` para el resto. */
  key: string;
  categoryId: number | null;
  name: string;
  products: Product[];
}

/** Minúsculas y sin acentos, la misma normalización que usa la regla de coincidencia (G4). */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Compara nombres sin distinguir acentos ni mayúsculas. */
export function compareNames(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * G5: ordena por nombre, precio o stock; el empate se resuelve por nombre ascendente
 * normalizado y luego por id. No modifica la lista recibida.
 */
export function sortProducts(
  products: readonly Product[],
  key: GridSortKey,
  direction: GridSortDirection,
): Product[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...products].sort((a, b) => {
    let primary = 0;
    if (key === 'name') primary = compareNames(a.name, b.name);
    else if (key === 'price') primary = a.price - b.price;
    else primary = a.stock - b.stock;

    if (primary !== 0) return primary * sign;
    return compareNames(a.name, b.name) || a.id - b.id;
  });
}

/**
 * G4: un grupo por `category_id` con el nombre de `category_name`; grupos ordenados
 * alfabéticamente y "Sin categoría" al final. Conserva el orden de entrada dentro de cada
 * grupo (el orden se aplica antes con `sortProducts`). Un grupo sin productos no existe.
 */
export function groupProducts(products: readonly Product[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const product of products) {
    const categoryId = product.category_id;
    const key = categoryId === null ? 'none' : `cat-${categoryId}`;
    let group = groups.get(key);
    if (!group) {
      const name = categoryId === null
        ? UNCATEGORIZED_LABEL
        : (product.category_name?.trim() || `Categoría ${categoryId}`);
      group = { key, categoryId, name, products: [] };
      groups.set(key, group);
    }
    group.products.push(product);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.categoryId === null) return 1;
    if (b.categoryId === null) return -1;
    return compareNames(a.name, b.name) || (a.categoryId - b.categoryId);
  });
}

// ---------------------------------------------------------------------------
// Estados de la cuadrícula (FR2.10, FR2.11, G3, G8)
// ---------------------------------------------------------------------------

export type GridStatus =
  | 'loading'
  | 'error'
  | 'empty-catalog'
  | 'empty-filter'
  | 'populated'
  | 'refreshing'
  | 'stale';

export interface GridState {
  status: GridStatus;
  products: Product[];
  /** Texto recortado de la carga vigente. */
  term: string;
  /** Secuencia vigente: solo se aplica la respuesta que la lleve (G3). */
  seq: number;
  errorMessage: string | null;
  /** Hubo al menos una respuesta aplicada; decide `refreshing`/`stale` frente a `loading`/`error`. */
  hasData: boolean;
}

export type GridEvent =
  | { type: 'load-requested'; seq: number; term: string }
  | { type: 'response'; seq: number; products: Product[] }
  | { type: 'failed'; seq: number; message: string };

export const initialGridState: GridState = {
  status: 'loading',
  products: [],
  term: '',
  seq: 0,
  errorMessage: null,
  hasData: false,
};

/** Un texto de solo espacios equivale a texto vacío. */
export function normalizeGridTerm(term: string): string {
  return term.trim();
}

export function gridReducer(state: GridState, event: GridEvent): GridState {
  switch (event.type) {
    case 'load-requested':
      // Cualquier carga nueva invalida lo que está en vuelo; con datos previos se conservan.
      return {
        ...state,
        status: state.hasData ? 'refreshing' : 'loading',
        term: normalizeGridTerm(event.term),
        seq: event.seq,
        errorMessage: null,
      };
    case 'response': {
      if (event.seq !== state.seq) return state;
      let status: GridStatus = 'populated';
      if (event.products.length === 0) {
        status = state.term === '' ? 'empty-catalog' : 'empty-filter';
      }
      return {
        ...state,
        status,
        products: event.products,
        errorMessage: null,
        hasData: true,
      };
    }
    case 'failed':
      if (event.seq !== state.seq) return state;
      return {
        ...state,
        status: state.hasData ? 'stale' : 'error',
        errorMessage: event.message,
      };
  }
}
