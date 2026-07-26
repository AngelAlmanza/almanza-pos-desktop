import type { UserRole } from '@modules/shared/types/base';

export type { User } from '@modules/shared/types/users';

export interface CreateUserDTO {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  id: number;
  username?: string;
  password?: string;
  full_name?: string;
  role?: UserRole;
  active?: boolean;
}
