import { invoke } from '@tauri-apps/api/core';
import type {
  CreateProductDTO,
  Product,
  ProductImagePreview,
  UpdateProductDTO,
} from '@modules/catalog/products/types';

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

  /**
   * Sugerencias de búsqueda: solo productos activos, sin acentos ni mayúsculas, con los que
   * empiezan con el texto primero. Sin `limit` devuelve todas las coincidencias.
   */
  static async suggest(term: string, limit?: number): Promise<Product[]> {
    return invoke<Product[]>('suggest_products', { term, limit });
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

  static async inspectImage(sourcePath: string): Promise<ProductImagePreview> {
    return invoke<ProductImagePreview>('inspect_product_image', { sourcePath });
  }

  /** Respaldo: la copia guardada como data URL, o `null` si ya no existe. */
  static async readImage(imageFile: string): Promise<string | null> {
    return invoke<string | null>('read_product_image', { imageFile });
  }

  static async getImagesDir(): Promise<string> {
    return invoke<string>('get_product_images_dir');
  }
}
