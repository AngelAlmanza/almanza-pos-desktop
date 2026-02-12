import { invoke } from '@tauri-apps/api/core';
import type { Product } from '../models';
import type { CreateProductDTO, UpdateProductDTO } from '../dto';

export class ProductService {
  static async getAll(): Promise<Product[]> {
    return invoke<Product[]>('get_products');
  }

  static async getActive(): Promise<Product[]> {
    return invoke<Product[]>('get_active_products');
  }

  static async getById(id: number): Promise<Product> {
    return invoke<Product>('get_product', { id });
  }

  static async findByBarcode(barcode: string): Promise<Product> {
    return invoke<Product>('find_product_by_barcode', { barcode });
  }

  static async search(term: string): Promise<Product[]> {
    return invoke<Product[]>('search_products', { term });
  }

  static async create(dto: CreateProductDTO): Promise<Product> {
    return invoke<Product>('create_product', { request: dto });
  }

  static async update(dto: UpdateProductDTO): Promise<Product> {
    return invoke<Product>('update_product', { request: dto });
  }

  static async delete(id: number): Promise<void> {
    return invoke<void>('delete_product', { id });
  }
}
