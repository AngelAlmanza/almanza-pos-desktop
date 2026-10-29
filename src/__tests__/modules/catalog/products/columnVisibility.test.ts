import { describe, expect, it } from 'vitest';
import type { ProductColumnKey } from '@modules/catalog/products/types';
import {
  ALL_COLUMN_KEYS,
  PRODUCT_COLUMNS,
  normalizeVisibleColumns,
  toggleColumn,
} from '@modules/catalog/products/utils/columnVisibility';

describe('columnVisibility', () => {
  it('por defecto todas las columnas son visibles', () => {
    expect(ALL_COLUMN_KEYS).toEqual(PRODUCT_COLUMNS.map((c) => c.key));
    expect(ALL_COLUMN_KEYS).toHaveLength(7);
  });

  it('oculta una columna visible', () => {
    const next = toggleColumn(ALL_COLUMN_KEYS, 'barcode');
    expect(next).not.toContain('barcode');
    expect(next).toHaveLength(6);
  });

  it('volver a mostrar una columna conserva el orden de la tabla', () => {
    const hidden = toggleColumn(ALL_COLUMN_KEYS, 'unit');
    const shown = toggleColumn(hidden, 'unit');
    expect(shown).toEqual(ALL_COLUMN_KEYS);
  });

  it('las columnas fijas (Producto y Acciones) no se pueden ocultar', () => {
    const keys = PRODUCT_COLUMNS.map((c) => c.key as string);
    expect(keys).not.toContain('name');
    expect(keys).not.toContain('actions');
    const fixed = 'name' as unknown as ProductColumnKey;
    expect(toggleColumn(ALL_COLUMN_KEYS, fixed)).toEqual(ALL_COLUMN_KEYS);
  });

  it('descarta claves desconocidas y repetidas', () => {
    expect(normalizeVisibleColumns(['price', 'foo', 'price', 'barcode'])).toEqual(['barcode', 'price']);
  });

  it('ocultar todas deja solo las fijas (lista vacía de opcionales)', () => {
    const none = ALL_COLUMN_KEYS.reduce<ProductColumnKey[]>((acc, key) => toggleColumn(acc, key), ALL_COLUMN_KEYS);
    expect(none).toEqual([]);
  });
});
