import { describe, expect, it } from 'vitest';
import { truncateText } from '@modules/catalog/products/utils/truncateText';

describe('truncateText', () => {
  it('deja sin cambios un texto corto', () => {
    expect(truncateText('Bebidas', 24)).toBe('Bebidas');
  });

  it('no corta un texto del largo exacto del límite', () => {
    const text = 'a'.repeat(24);
    expect(truncateText(text, 24)).toBe(text);
  });

  it('con un carácter más corta y agrega "…" (regresión de nombres largos)', () => {
    const text = 'a'.repeat(25);
    expect(truncateText(text, 24)).toBe(`${'a'.repeat(24)}…`);
  });

  it('devuelve vacío para una cadena vacía', () => {
    expect(truncateText('', 24)).toBe('');
  });

  it('devuelve vacío cuando el máximo es 0 o negativo', () => {
    expect(truncateText('Bebidas', 0)).toBe('');
    expect(truncateText('Bebidas', -3)).toBe('');
  });
});
