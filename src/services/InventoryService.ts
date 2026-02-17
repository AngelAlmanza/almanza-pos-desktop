import { invoke } from '@tauri-apps/api/core';
import type { CreateInventoryAdjustmentDTO, DateRangeDTO } from '../dto';
import type { InventoryAdjustment } from '../models';

export class InventoryService {
  static async getAll(): Promise<InventoryAdjustment[]> {
    return invoke<InventoryAdjustment[]>('get_inventory_adjustments');
  }

  static async getByDateRange(dto: DateRangeDTO): Promise<InventoryAdjustment[]> {
    return invoke<InventoryAdjustment[]>('get_inventory_adjustments_by_date_range', { request: dto });
  }

  static async getByProduct(productId: number): Promise<InventoryAdjustment[]> {
    return invoke<InventoryAdjustment[]>('get_inventory_adjustments_by_product', { productId });
  }

  static async create(dto: CreateInventoryAdjustmentDTO): Promise<InventoryAdjustment> {
    return invoke<InventoryAdjustment>('create_inventory_adjustment', { request: dto });
  }
}
