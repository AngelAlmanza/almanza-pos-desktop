import { invoke } from '@tauri-apps/api/core';
import type { CreateInventoryAdjustmentDTO, DateRangeDTO } from '../dto';
import type { InventoryAdjustment, PaginatedResult } from '../models';

export class InventoryService {
  static async getAll(): Promise<InventoryAdjustment[]> {
    return invoke<InventoryAdjustment[]>('get_inventory_adjustments');
  }

  static async getByDateRange(dto: DateRangeDTO, page = 1, pageSize = 50): Promise<PaginatedResult<InventoryAdjustment>> {
    return invoke<PaginatedResult<InventoryAdjustment>>('get_inventory_adjustments_by_date_range', { request: dto, page, pageSize });
  }

  static async getByProduct(productId: number): Promise<InventoryAdjustment[]> {
    return invoke<InventoryAdjustment[]>('get_inventory_adjustments_by_product', { productId });
  }

  static async create(dto: CreateInventoryAdjustmentDTO): Promise<InventoryAdjustment> {
    return invoke<InventoryAdjustment>('create_inventory_adjustment', { request: dto });
  }
}
