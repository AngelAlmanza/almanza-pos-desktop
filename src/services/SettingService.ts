import { invoke } from '@tauri-apps/api/core';
import type { CreateSettingDTO, UpdateSettingDTO } from '../dto';
import type { Setting } from '../models';

export class SettingService {
  static async getAll(): Promise<Setting[]> {
    return invoke<Setting[]>('get_settings');
  }

  static async update(dto: UpdateSettingDTO): Promise<Setting> {
    return invoke<Setting>('update_setting', { request: dto });
  }

  static async create(dto: CreateSettingDTO): Promise<Setting> {
    return invoke<Setting>('create_setting', { request: dto });
  }

  static async delete(key: string): Promise<void> {
    return invoke<void>('delete_setting', { key });
  }

  static async saveImage(key: string, srcPath: string): Promise<string> {
    return invoke<string>('save_setting_image', { key, srcPath });
  }

  static async getImage(key: string): Promise<string | null> {
    return invoke<string | null>('get_setting_image', { key });
  }
}
