import { Decimal } from 'decimal.js';
import type { ProductUnit, SaleInputMode } from '@modules/shared/types/base';
import { roundQuantity } from '@modules/shared/utils/money';

type NumericValue = Decimal.Value;

export type UnitFamily = 'mass' | 'volume' | 'length' | 'discrete';
export type UnitCode = ProductUnit | 'g' | 'ml' | 'cm';

export interface UnitMeta {
  code: UnitCode;
  family: UnitFamily;
  baseUnit: UnitCode;
  factorToBase: string;
  displayLabel: string;
}

export interface SubUnitConfig {
  subUnitCode: UnitCode;
  subUnitLabel: string;
  baseUnitCode: UnitCode;
  baseUnitLabel: string;
  factor: number;
}

export interface QuantityProduct {
  is_bulk: boolean;
  unit: ProductUnit;
  price: number;
}

export interface QuantitySelection {
  quantity: number;
  input_mode: SaleInputMode;
  input_value: number;
  input_unit: string;
}

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitConversionError';
  }
}

export const UNIT_CATALOG = {
  kg: {
    code: 'kg',
    family: 'mass',
    baseUnit: 'kg',
    factorToBase: '1',
    displayLabel: 'kg',
  },
  g: {
    code: 'g',
    family: 'mass',
    baseUnit: 'kg',
    factorToBase: '0.001',
    displayLabel: 'g',
  },
  litro: {
    code: 'litro',
    family: 'volume',
    baseUnit: 'litro',
    factorToBase: '1',
    displayLabel: 'litro',
  },
  ml: {
    code: 'ml',
    family: 'volume',
    baseUnit: 'litro',
    factorToBase: '0.001',
    displayLabel: 'ml',
  },
  metro: {
    code: 'metro',
    family: 'length',
    baseUnit: 'metro',
    factorToBase: '1',
    displayLabel: 'metro',
  },
  cm: {
    code: 'cm',
    family: 'length',
    baseUnit: 'metro',
    factorToBase: '0.01',
    displayLabel: 'cm',
  },
  pieza: {
    code: 'pieza',
    family: 'discrete',
    baseUnit: 'pieza',
    factorToBase: '1',
    displayLabel: 'pieza',
  },
  paquete: {
    code: 'paquete',
    family: 'discrete',
    baseUnit: 'paquete',
    factorToBase: '1',
    displayLabel: 'paquete',
  },
  caja: {
    code: 'caja',
    family: 'discrete',
    baseUnit: 'caja',
    factorToBase: '1',
    displayLabel: 'caja',
  },
  otro: {
    code: 'otro',
    family: 'discrete',
    baseUnit: 'otro',
    factorToBase: '1',
    displayLabel: 'otro',
  },
} as const satisfies Record<UnitCode, UnitMeta>;

function isUnitCode(unit: string): unit is UnitCode {
  return Object.prototype.hasOwnProperty.call(UNIT_CATALOG, unit);
}

function areCompatible(fromMeta: UnitMeta, toMeta: UnitMeta): boolean {
  return fromMeta.family === toMeta.family && fromMeta.baseUnit === toMeta.baseUnit;
}

function toDecimal(value: NumericValue): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function getUnitMeta(unit: string): UnitMeta {
  if (!isUnitCode(unit)) {
    throw new UnitConversionError(`Unknown unit: ${unit}.`);
  }

  return UNIT_CATALOG[unit];
}

export function isCompatible(from: string, to: string): boolean {
  try {
    return areCompatible(getUnitMeta(from), getUnitMeta(to));
  } catch {
    return false;
  }
}

export function toBase(value: NumericValue, unit: string): Decimal {
  const meta = getUnitMeta(unit);
  return toDecimal(value).times(meta.factorToBase);
}

export function fromBase(value: NumericValue, unit: string): Decimal {
  const meta = getUnitMeta(unit);
  return toDecimal(value).div(meta.factorToBase);
}

export function convert(value: NumericValue, from: string, to: string): Decimal {
  const fromMeta = getUnitMeta(from);
  const toMeta = getUnitMeta(to);

  if (!areCompatible(fromMeta, toMeta)) {
    throw new UnitConversionError(`Cannot convert from ${from} to ${to}: incompatible units.`);
  }

  return fromBase(toBase(value, from), to);
}

export function getCompatibleUnits(unit: string): UnitMeta[] {
  const meta = getUnitMeta(unit);

  return Object.values(UNIT_CATALOG).filter((candidate) => areCompatible(meta, candidate));
}

export function getUnitConfig(unit: ProductUnit): SubUnitConfig | null {
  const baseMeta = getUnitMeta(unit);
  const subUnit = getCompatibleUnits(unit)
    .filter((candidate) => candidate.code !== unit)
    .filter((candidate) => new Decimal(candidate.factorToBase).lt(baseMeta.factorToBase))
    .sort((a, b) => new Decimal(b.factorToBase).cmp(a.factorToBase))[0];

  if (!subUnit) {
    return null;
  }

  return {
    subUnitCode: subUnit.code,
    subUnitLabel: subUnit.displayLabel,
    baseUnitCode: baseMeta.code,
    baseUnitLabel: baseMeta.displayLabel,
    factor: new Decimal(baseMeta.factorToBase).div(subUnit.factorToBase).toNumber(),
  };
}

export function supportsBulkQuantityInput(unit: ProductUnit): boolean {
  return getUnitConfig(unit) !== null;
}

export function usesBulkQuantityInput(product: Pick<QuantityProduct, 'is_bulk' | 'unit'>): boolean {
  return product.is_bulk;
}

export function isBulkUnit(unit: ProductUnit): boolean {
  return supportsBulkQuantityInput(unit);
}

export function subUnitToBase(value: NumericValue, unit: ProductUnit): Decimal {
  const config = getUnitConfig(unit);

  if (!config) {
    throw new UnitConversionError(`Unit ${unit} does not have a compatible subunit.`);
  }

  return convert(value, config.subUnitCode, config.baseUnitCode);
}

export function amountToQuantity(amount: NumericValue, pricePerUnit: NumericValue): Decimal {
  const amountDecimal = toDecimal(amount);
  const price = toDecimal(pricePerUnit);

  if (amountDecimal.isNegative()) {
    throw new UnitConversionError('Amount must be zero or greater.');
  }

  if (price.lte(0)) {
    throw new UnitConversionError('Price per unit must be greater than zero.');
  }

  return amountDecimal.div(price);
}

export function quantityInputToBase(
  input: Pick<QuantitySelection, 'input_mode' | 'input_value' | 'input_unit'>,
  product: Pick<QuantityProduct, 'price' | 'unit'>,
): Decimal {
  switch (input.input_mode) {
    case 'base':
      if (input.input_unit !== product.unit) {
        throw new UnitConversionError(`Expected base unit ${product.unit}, received ${input.input_unit}.`);
      }
      return toDecimal(input.input_value);
    case 'sub': {
      const config = getUnitConfig(product.unit);
      if (!config || input.input_unit !== config.subUnitCode) {
        throw new UnitConversionError(`Unit ${input.input_unit} is not a valid subunit for ${product.unit}.`);
      }
      return convert(input.input_value, input.input_unit, product.unit);
    }
    case 'amount':
      if (input.input_unit !== 'MXN') {
        throw new UnitConversionError(`Amount input must use MXN, received ${input.input_unit}.`);
      }
      return amountToQuantity(input.input_value, product.price);
  }
}

export function buildQuantitySelection(
  input: Pick<QuantitySelection, 'input_mode' | 'input_value' | 'input_unit'>,
  product: Pick<QuantityProduct, 'price' | 'unit'>,
): QuantitySelection {
  return {
    ...input,
    quantity: roundQuantity(quantityInputToBase(input, product).toNumber()),
  };
}
