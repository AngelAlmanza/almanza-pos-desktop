import type { ProductColumnKey } from '@modules/catalog/products/types';

// "Producto" y "Acciones" son fijas y no se pueden ocultar; no forman parte de esta lista.
export const PRODUCT_COLUMNS: ReadonlyArray<{ key: ProductColumnKey; label: string }> = [
  { key: 'barcode', label: 'Código' },
  { key: 'category', label: 'Categoría' },
  { key: 'unit', label: 'Unidad' },
  { key: 'price', label: 'Precio' },
  { key: 'stock', label: 'Stock' },
  { key: 'min_stock', label: 'Mín.' },
  { key: 'status', label: 'Estado' },
];

// Por defecto todas las columnas son visibles.
export const ALL_COLUMN_KEYS: ProductColumnKey[] = PRODUCT_COLUMNS.map((column) => column.key);

// Devuelve solo claves conocidas, sin repetir y en el orden de la tabla.
export function normalizeVisibleColumns(keys: ReadonlyArray<string>): ProductColumnKey[] {
  const wanted = new Set(keys);
  return ALL_COLUMN_KEYS.filter((key) => wanted.has(key));
}

// Oculta la columna si está visible; la muestra si estaba oculta. Conserva el orden de la tabla.
export function toggleColumn(
  visible: ReadonlyArray<ProductColumnKey>,
  key: ProductColumnKey,
): ProductColumnKey[] {
  if (!ALL_COLUMN_KEYS.includes(key)) return normalizeVisibleColumns(visible);
  const next = visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key];
  return normalizeVisibleColumns(next);
}
