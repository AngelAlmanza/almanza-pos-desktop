import type { AdjustmentType } from '@modules/shared/types/base';

export interface InventoryAdjustment {
  id: number;
  product_id: number;
  product_name: string | null;
  user_id: number;
  user_name: string | null;
  adjustment_type: AdjustmentType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
}

export interface CreateInventoryAdjustmentDTO {
  product_id: number;
  user_id: number;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason?: string;
}
