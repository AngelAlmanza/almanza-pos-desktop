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
}
