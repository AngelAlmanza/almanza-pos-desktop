import { Decimal } from 'decimal.js';
import type { Product, ProductFilters, StockStatus } from '@modules/catalog/products/types';

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  normal: 'Normal',
  low: 'Bajo',
  out: 'Agotado',
};

export interface StockSummary {
  active: number;
  low: number;
  out: number;
}

export type CategoryCounts = Record<string, number>;

export const NO_CATEGORY_KEY = 'none';

const collator = new Intl.Collator('es', { sensitivity: 'base' });

// FR2.2: agotado <= 0, bajo <= mínimo, normal en otro caso. Inactivo no tiene estado.
export function getStockStatus(product: Product): StockStatus | null {
  if (!product.active) return null;
  const stock = new Decimal(product.stock).toDecimalPlaces(3);
  if (stock.lte(0)) return 'out';
  if (stock.lte(new Decimal(product.min_stock).toDecimalPlaces(3))) return 'low';
  return 'normal';
}

// FR8.1: los inactivos no cuentan.
export function summarizeStock(products: Product[]): StockSummary {
  const summary: StockSummary = { active: 0, low: 0, out: 0 };
  for (const product of products) {
    const status = getStockStatus(product);
    if (status === null) continue;
    summary.active += 1;
    if (status === 'low') summary.low += 1;
    if (status === 'out') summary.out += 1;
  }
  return summary;
}

// FR9.1: categoría, estado y "Mostrar inactivos" se combinan.
export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (!product.active && !filters.showInactive) return false;
    if (filters.category === 'none' && product.category_id !== null) return false;
    if (typeof filters.category === 'number' && product.category_id !== filters.category) {
      return false;
    }
    if (filters.status !== 'all' && getStockStatus(product) !== filters.status) return false;
    return true;
  });
}

// Conteo por categoría sobre los productos visibles (activos, o todos si se muestran inactivos).
export function countByCategory(products: Product[], showInactive: boolean): CategoryCounts {
  const counts: CategoryCounts = { all: 0, [NO_CATEGORY_KEY]: 0 };
  for (const product of products) {
    if (!product.active && !showInactive) continue;
    counts.all += 1;
    const key = product.category_id === null ? NO_CATEGORY_KEY : String(product.category_id);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// FR2.5: por nombre sin distinguir mayúsculas ni acentos; empate por orden de alta (id).
export function compareProductsByName(a: Product, b: Product): number {
  const byName = collator.compare(a.name, b.name);
  return byName !== 0 ? byName : a.id - b.id;
}
