import { invoke } from '@tauri-apps/api/core';
import type { LoginResponse, User } from '../models';
import type { LoginDTO } from '../dto';

const SESSION_KEY = 'pos_session';

export class AuthService {
  static async login(dto: LoginDTO): Promise<LoginResponse> {
    const response = await invoke<LoginResponse>('login', { request: dto });
    localStorage.setItem(SESSION_KEY, JSON.stringify(response));
    return response;
  }

  static logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  static getSession(): LoginResponse | null {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as LoginResponse;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  static getCurrentUser(): User | null {
    const session = this.getSession();
    return session?.user ?? null;
  }

  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  static getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id ?? null;
  }
}
