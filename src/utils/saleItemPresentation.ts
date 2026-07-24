import type { SaleInputMode } from '../types';
import { formatCurrency } from './FormatCurrency';

export interface SaleItemPresentationData {
  quantity: number;
  base_unit: string | null;
  input_mode: SaleInputMode | null;
  input_value: number | null;
  input_unit: string | null;
  unit_price: number;
  subtotal: number;
}

export function formatQuantityValue(value: number): string {
  return value.toFixed(3).replace(/\.?0+$/, '');
}

export function getPurchaseLabel(item: SaleItemPresentationData): string {
  if (item.input_mode === null || item.input_value === null || item.input_unit === null) {
    return `${formatQuantityValue(item.quantity)} · Unidad no registrada`;
  }

  if (item.input_mode === 'amount') {
    return formatCurrency(item.input_value, 'MXN');
  }

  return `${formatQuantityValue(item.input_value)} ${item.input_unit}`;
}

export function getBaseEquivalentLabel(item: SaleItemPresentationData): string | null {
  if (item.input_mode !== 'amount') return null;

  return `${formatQuantityValue(item.quantity)} ${item.base_unit ?? 'Unidad no registrada'}`;
}

export function getBasePriceLabel(item: Pick<SaleItemPresentationData, 'base_unit' | 'unit_price'>): string {
  const price = formatCurrency(item.unit_price, 'MXN');
  return item.base_unit ? `${price}/${item.base_unit}` : `${price} · Unidad no registrada`;
}
