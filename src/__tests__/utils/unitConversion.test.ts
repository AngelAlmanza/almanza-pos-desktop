import { describe, it, expect } from 'vitest';
import { isBulkUnit, getUnitConfig, subUnitToBase, amountToQuantity } from '../../utils/unitConversion';
import type { ProductUnit } from '../../types';

describe('isBulkUnit', () => {
  it.each<[ProductUnit, boolean]>([
    ['kg', true],
    ['litro', true],
    ['metro', true],
    ['pieza', false],
    ['paquete', false],
    ['caja', false],
    ['otro', false],
  ])('isBulkUnit(%s) → %s', (unit, expected) => {
    expect(isBulkUnit(unit)).toBe(expected);
  });
});

describe('getUnitConfig', () => {
  it('returns config for kg', () => {
    const config = getUnitConfig('kg');
    expect(config).toEqual({ subUnitLabel: 'g', baseUnitLabel: 'kg', factor: 1000 });
  });

  it('returns config for litro', () => {
    const config = getUnitConfig('litro');
    expect(config).toEqual({ subUnitLabel: 'ml', baseUnitLabel: 'litro', factor: 1000 });
  });

  it('returns config for metro', () => {
    const config = getUnitConfig('metro');
    expect(config).toEqual({ subUnitLabel: 'cm', baseUnitLabel: 'metro', factor: 100 });
  });

  it('returns null for non-bulk units', () => {
    expect(getUnitConfig('pieza')).toBeNull();
  });
});

describe('subUnitToBase', () => {
  it('converts 500g to 0.5kg', () => {
    expect(subUnitToBase(500, 'kg').toNumber()).toBe(0.5);
  });

  it('converts 250ml to 0.25 litro', () => {
    expect(subUnitToBase(250, 'litro').toNumber()).toBe(0.25);
  });

  it('converts 50cm to 0.5 metro', () => {
    expect(subUnitToBase(50, 'metro').toNumber()).toBe(0.5);
  });

  it('accepts string input', () => {
    expect(subUnitToBase('350', 'kg').toNumber()).toBe(0.35);
  });

  it('returns value as-is for non-bulk units', () => {
    expect(subUnitToBase(3, 'pieza').toNumber()).toBe(3);
  });

  it('avoids floating-point drift', () => {
    // 1g = 0.001kg — should not produce 0.0010000000000000000208...
    expect(subUnitToBase(1, 'kg').toNumber()).toBe(0.001);
  });
});

describe('amountToQuantity', () => {
  it('$50 at $100/kg → 0.5kg', () => {
    expect(amountToQuantity(50, 100).toNumber()).toBe(0.5);
  });

  it('$25 at $80/kg → 0.3125kg', () => {
    expect(amountToQuantity(25, 80).toNumber()).toBe(0.3125);
  });

  it('returns 0 when price is 0', () => {
    expect(amountToQuantity(50, 0).toNumber()).toBe(0);
  });

  it('accepts string inputs', () => {
    expect(amountToQuantity('100', '200').toNumber()).toBe(0.5);
  });
});
