import type { Product } from '@modules/catalog/products/types';
import type { ProductUnit, SaleInputMode } from '@modules/shared/types/base';

export interface SaleQuantitySelection {
  quantity: number;
  input_mode: SaleInputMode;
  input_value: number;
  input_unit: string;
}

export interface CartItem extends SaleQuantitySelection {
  line_key: string;
  product: Product;
  base_unit: ProductUnit;
  subtotal: number;
}
