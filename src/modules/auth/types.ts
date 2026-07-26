import type { User } from '@modules/shared/types/users';

export interface LoginResponse {
  user: User;
  token: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}
