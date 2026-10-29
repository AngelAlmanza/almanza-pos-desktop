import type { ProductUnit } from '@modules/shared/types/base';

export interface Product {
  id: number;
  name: string;
  description: string | null;
  barcode: string | null;
  price: number;
  unit: ProductUnit;
  is_bulk: boolean;
  category_id: number | null;
  category_name: string | null;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  image_file: string | null;
}

export type ProductImageChangeKind = 'keep' | 'replace' | 'remove';

export interface ProductImageChange {
  kind: ProductImageChangeKind;
  source_path?: string;
}

export interface ProductImagePreview {
  format: string;
  size_bytes: number;
  preview: string;
}

export interface CreateProductDTO {
  name: string;
  description?: string;
  barcode?: string;
  price: number;
  unit: ProductUnit;
  is_bulk: boolean;
  category_id?: number;
  stock?: number;
  min_stock?: number;
  image?: ProductImageChange;
}

export interface UpdateProductDTO {
  id: number;
  name?: string;
  description?: string;
  barcode?: string;
  price?: number;
  unit?: ProductUnit;
  is_bulk?: boolean;
  category_id?: number;
  min_stock?: number;
  active?: boolean;
  image?: ProductImageChange;
}

// Tipos locales del módulo unificado de Productos.
export type StockStatus = 'normal' | 'low' | 'out';

export type StockStatusFilter = StockStatus | 'all';

// 'all' = todas las categorías; 'none' = "Sin categoría"; número = id de categoría.
export type CategoryFilter = 'all' | 'none' | number;

export interface ProductFilters {
  category: CategoryFilter;
  status: StockStatusFilter;
  showInactive: boolean;
}

// Columnas de la tabla que se pueden mostrar u ocultar ("Producto" y "Acciones" son fijas).
export type ProductColumnKey =
  | 'barcode'
  | 'category'
  | 'unit'
  | 'price'
  | 'stock'
  | 'min_stock'
  | 'status';

export interface ProductPermissions {
  canViewList: boolean;
  canAdjustStock: boolean;
  canManageProducts: boolean;
  canManageCategories: boolean;
  canViewHistory: boolean;
}
