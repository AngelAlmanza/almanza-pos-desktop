import { invoke } from '@tauri-apps/api/core';
import type { Sale, SalesReport, TopProduct } from '../models';
import type { CreateSaleDTO, DateRangeDTO } from '../dto';

export class SaleService {
  static async create(dto: CreateSaleDTO): Promise<Sale> {
    return invoke<Sale>('create_sale', { request: dto });
  }

  static async getById(id: number): Promise<Sale> {
    return invoke<Sale>('get_sale', { id });
  }

  static async getAll(): Promise<Sale[]> {
    return invoke<Sale[]>('get_sales');
  }

  static async getBySession(sessionId: number): Promise<Sale[]> {
    return invoke<Sale[]>('get_sales_by_session', { sessionId });
  }

  static async getByDateRange(dto: DateRangeDTO): Promise<Sale[]> {
    return invoke<Sale[]>('get_sales_by_date_range', { request: dto });
  }

  static async getReport(dto: DateRangeDTO): Promise<SalesReport> {
    return invoke<SalesReport>('get_sales_report', { request: dto });
  }

  static async getTopProducts(startDate: string, endDate: string, limit?: number): Promise<TopProduct[]> {
    return invoke<TopProduct[]>('get_top_products', { startDate, endDate, limit });
  }

  static async cancel(saleId: number): Promise<void> {
    return invoke<void>('cancel_sale', { saleId });
  }
}
