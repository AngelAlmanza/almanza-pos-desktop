import { describe, it, expect } from 'vitest';
import {
  amountToQuantity,
  convert,
  fromBase,
  getCompatibleUnits,
  getUnitConfig,
  getUnitMeta,
  isBulkUnit,
  isCompatible,
  subUnitToBase,
  supportsBulkQuantityInput,
  toBase,
  UnitConversionError,
  usesBulkQuantityInput,
} from '../../utils/unitConversion';
import type { ProductUnit } from '../../types';

describe('unit catalog', () => {
  it('returns metadata for a known unit', () => {
    expect(getUnitMeta('g')).toEqual({
      code: 'g',
      family: 'mass',
      baseUnit: 'kg',
      factorToBase: '0.001',
      displayLabel: 'g',
    });
  });

  it('throws a clear error for unknown units', () => {
    expect(() => getUnitMeta('ton')).toThrow(UnitConversionError);
    expect(() => getUnitMeta('ton')).toThrow('Unknown unit: ton.');
  });
});

describe('isCompatible', () => {
  it.each<[string, string, boolean]>([
    ['kg', 'g', true],
    ['litro', 'ml', true],
    ['metro', 'cm', true],
    ['kg', 'ml', false],
    ['pieza', 'paquete', false],
    ['pieza', 'pieza', true],
    ['kg', 'ton', false],
  ])('isCompatible(%s, %s) -> %s', (from, to, expected) => {
    expect(isCompatible(from, to)).toBe(expected);
  });
});

describe('convert', () => {
  it.each<[number, string, string, number]>([
    [1, 'kg', 'g', 1000],
    [500, 'g', 'kg', 0.5],
    [1, 'litro', 'ml', 1000],
    [250, 'ml', 'litro', 0.25],
    [1, 'metro', 'cm', 100],
    [50, 'cm', 'metro', 0.5],
  ])('converts %s %s to %s', (value, from, to, expected) => {
    expect(convert(value, from, to).toNumber()).toBe(expected);
  });

  it('keeps precision for small mass values', () => {
    expect(convert(1, 'g', 'kg').toString()).toBe('0.001');
  });

  it('throws for incompatible units instead of returning the original value', () => {
    expect(() => convert(3, 'kg', 'ml')).toThrow(UnitConversionError);
    expect(() => convert(3, 'kg', 'ml')).toThrow('Cannot convert from kg to ml: incompatible units.');
  });
});

describe('base conversions', () => {
  it('converts to each family base unit', () => {
    expect(toBase(1250, 'g').toNumber()).toBe(1.25);
    expect(toBase(1250, 'ml').toNumber()).toBe(1.25);
    expect(toBase(125, 'cm').toNumber()).toBe(1.25);
  });

  it('converts from each family base unit', () => {
    expect(fromBase(1.25, 'g').toNumber()).toBe(1250);
    expect(fromBase(1.25, 'ml').toNumber()).toBe(1250);
    expect(fromBase(1.25, 'cm').toNumber()).toBe(125);
  });
});

describe('getCompatibleUnits', () => {
  it('returns the central compatible set for a measured unit', () => {
    expect(getCompatibleUnits('kg').map((unit) => unit.code)).toEqual(['kg', 'g']);
  });

  it('keeps discrete units isolated because package sizes are product-specific', () => {
    expect(getCompatibleUnits('paquete').map((unit) => unit.code)).toEqual(['paquete']);
  });
});

describe('bulk product helpers', () => {
  it('uses the explicit product flag instead of inferring behavior from the unit', () => {
    expect(usesBulkQuantityInput({ is_bulk: true, unit: 'kg' })).toBe(true);
    expect(usesBulkQuantityInput({ is_bulk: false, unit: 'kg' })).toBe(false);
  });

  it.each<[ProductUnit, boolean]>([
    ['kg', true],
    ['litro', true],
    ['metro', true],
    ['pieza', false],
    ['paquete', false],
    ['caja', false],
    ['otro', false],
  ])('supportsBulkQuantityInput(%s) -> %s', (unit, expected) => {
    expect(supportsBulkQuantityInput(unit)).toBe(expected);
    expect(isBulkUnit(unit)).toBe(expected);
  });

  it('returns input config from catalog metadata', () => {
    expect(getUnitConfig('kg')).toEqual({
      subUnitCode: 'g',
      subUnitLabel: 'g',
      baseUnitCode: 'kg',
      baseUnitLabel: 'kg',
      factor: 1000,
    });
  });

  it('returns null when a product unit has no safe subunit conversion', () => {
    expect(getUnitConfig('pieza')).toBeNull();
  });

  it.each<[number | string, ProductUnit, number]>([
    [500, 'kg', 0.5],
    [250, 'litro', 0.25],
    [50, 'metro', 0.5],
    ['350', 'kg', 0.35],
  ])('converts subunit input to the product base unit', (value, unit, expected) => {
    expect(subUnitToBase(value, unit).toNumber()).toBe(expected);
  });

  it('throws when subunit conversion is not available', () => {
    expect(() => subUnitToBase(3, 'pieza')).toThrow('Unit pieza does not have a compatible subunit.');
  });
});

describe('amountToQuantity', () => {
  it('$50 at $100/kg -> 0.5kg', () => {
    expect(amountToQuantity(50, 100).toNumber()).toBe(0.5);
  });

  it('$25 at $80/kg -> 0.3125kg', () => {
    expect(amountToQuantity(25, 80).toNumber()).toBe(0.3125);
  });

  it('accepts string inputs', () => {
    expect(amountToQuantity('100', '200').toNumber()).toBe(0.5);
  });

  it('returns 0 for a zero amount with a positive price', () => {
    expect(amountToQuantity(0, 100).toNumber()).toBe(0);
  });

  it('throws when price cannot produce a safe quantity', () => {
    expect(() => amountToQuantity(50, 0)).toThrow('Price per unit must be greater than zero.');
  });
});
