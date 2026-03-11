import type { ProductUnit } from '../types';
import { Decimal } from 'decimal.js';

interface SubUnitConfig {
  subUnitLabel: string;
  baseUnitLabel: string;
  factor: number;
}

const UNIT_CONFIG: Partial<Record<ProductUnit, SubUnitConfig>> = {
  kg:    { subUnitLabel: 'g',  baseUnitLabel: 'kg',    factor: 1000 },
  litro: { subUnitLabel: 'ml', baseUnitLabel: 'litro', factor: 1000 },
  metro: { subUnitLabel: 'cm', baseUnitLabel: 'metro', factor: 100 },
};

export function isBulkUnit(unit: ProductUnit): boolean {
  return unit in UNIT_CONFIG;
}

export function getUnitConfig(unit: ProductUnit): SubUnitConfig | null {
  return UNIT_CONFIG[unit] ?? null;
}

export function subUnitToBase(value: number | string, unit: ProductUnit): Decimal {
  const config = UNIT_CONFIG[unit];
  if (!config) return new Decimal(value);
  return new Decimal(value).div(config.factor);
}

export function amountToQuantity(amount: number | string, pricePerUnit: number | string): Decimal {
  const price = new Decimal(pricePerUnit);
  if (price.isZero()) return new Decimal(0);
  return new Decimal(amount).div(price);
}
