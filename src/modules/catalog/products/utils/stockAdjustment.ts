import { Decimal } from 'decimal.js';
import type { AdjustmentType } from '@modules/shared/types/base';

// FR5.2 y FR7.3: nombres simples de los tres tipos de ajuste.
export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  add: 'Llegó mercancía',
  positive: 'Sobró al contar',
  negative: 'Faltó al contar',
};

export interface AdjustmentPreview {
  current: number;
  resulting: number;
}

export interface QuantityValidation {
  valid: boolean;
  value: number | null;
  error: string | null;
}

export interface QuantityProductShape {
  is_bulk: boolean;
}

// FR5.4: "negative" resta; "add" y "positive" suman. Resultado a 3 decimales.
export function previewAdjustment(
  currentStock: number,
  type: AdjustmentType,
  quantity: number,
): AdjustmentPreview {
  const current = new Decimal(currentStock);
  const amount = new Decimal(quantity);
  const result = type === 'negative' ? current.minus(amount) : current.plus(amount);
  return {
    current: current.toDecimalPlaces(3).toNumber(),
    resulting: result.toDecimalPlaces(3).toNumber(),
  };
}

const MESSAGES = {
  positive: 'La cantidad debe ser mayor que 0',
  integer: 'Este producto se cuenta por piezas: usa números enteros',
  decimals: 'Usa hasta 3 decimales',
} as const;

// FR5.3: > 0; enteros para productos por pieza; hasta 3 decimales a granel.
export function validateAdjustmentQuantity(
  input: string,
  product: QuantityProductShape,
): QuantityValidation {
  const text = input.trim();
  let value: Decimal;
  try {
    value = new Decimal(text);
  } catch {
    return { valid: false, value: null, error: MESSAGES.positive };
  }
  if (!value.isFinite() || value.lte(0)) {
    return { valid: false, value: null, error: MESSAGES.positive };
  }
  if (!product.is_bulk && !value.isInteger()) {
    return { valid: false, value: null, error: MESSAGES.integer };
  }
  if (product.is_bulk && value.decimalPlaces() > 3) {
    return { valid: false, value: null, error: MESSAGES.decimals };
  }
  return { valid: true, value: value.toNumber(), error: null };
}
