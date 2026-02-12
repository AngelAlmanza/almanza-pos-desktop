import { invoke } from '@tauri-apps/api/core';
import type { Category } from '../models';
import type { CreateCategoryDTO, UpdateCategoryDTO } from '../dto';

export class CategoryService {
  static async getAll(): Promise<Category[]> {
    return invoke<Category[]>('get_categories');
  }

  static async getById(id: number): Promise<Category> {
    return invoke<Category>('get_category', { id });
  }

  static async create(dto: CreateCategoryDTO): Promise<Category> {
    return invoke<Category>('create_category', { request: dto });
  }

  static async update(dto: UpdateCategoryDTO): Promise<Category> {
    return invoke<Category>('update_category', { request: dto });
  }

  static async delete(id: number): Promise<void> {
    return invoke<void>('delete_category', { id });
  }
}
