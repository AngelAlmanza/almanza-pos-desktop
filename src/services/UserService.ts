import { invoke } from '@tauri-apps/api/core';
import type { User } from '../models';
import type { CreateUserDTO, UpdateUserDTO } from '../dto';

export class UserService {
  static async getAll(): Promise<User[]> {
    return invoke<User[]>('get_users');
  }

  static async getById(id: number): Promise<User> {
    return invoke<User>('get_user', { id });
  }

  static async create(dto: CreateUserDTO): Promise<User> {
    return invoke<User>('create_user', { request: dto });
  }

  static async update(dto: UpdateUserDTO): Promise<User> {
    return invoke<User>('update_user', { request: dto });
  }

  static async delete(id: number): Promise<void> {
    return invoke<void>('delete_user', { id });
  }
}
