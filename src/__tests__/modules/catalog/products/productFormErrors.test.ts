import { describe, expect, it } from 'vitest';
import { mapProductError } from '@modules/catalog/products/utils/productFormErrors';

describe('mapProductError', () => {
  it('maps a duplicate barcode to the barcode field', () => {
    const result = mapProductError('El producto con código de barras 123 ya existe');
    expect(result.field).toBe('barcode');
    expect(result.message).toContain('código de barras');
  });

  it('maps an empty name to the name field', () => {
    expect(mapProductError('El nombre del producto no puede estar vacío').field).toBe('name');
  });

  it('maps a negative price to the price field', () => {
    expect(mapProductError('El precio no puede ser negativo').field).toBe('price');
  });

  it('matches even when the backend adds a prefix', () => {
    const result = mapProductError('Conflict: El producto con código de barras 9 ya existe');
    expect(result.field).toBe('barcode');
  });

  it('keeps unknown messages as a general alert', () => {
    expect(mapProductError('falla simulada')).toEqual({ field: null, message: 'falla simulada' });
  });
});
