import { invoke } from '@tauri-apps/api/core';
import type { LoginResponse, User } from '../models';
import type { LoginDTO } from '../dto';
import type { UserRole } from '../types';

const SESSION_KEY = 'pos_session';

export type UserRefreshResult =
  | { status: 'ok'; user: User }
  | { status: 'inactive' }
  | { status: 'not_found' }
  | { status: 'no_session' };

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
    const adminRole: UserRole = 'admin';
    return user?.role === adminRole;
  }

  static getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id ?? null;
  }

  static async refreshUser(): Promise<UserRefreshResult> {
    const session = this.getSession();
    if (!session) return { status: 'no_session' };

    try {
      const user = await invoke<User>('get_current_user', { userId: session.user.id });
      if (!user.active) return { status: 'inactive' };
      // Persist the fresh user data so the next cold start is up to date
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user }));
      return { status: 'ok', user };
    } catch {
      return { status: 'not_found' };
    }
  }
}
