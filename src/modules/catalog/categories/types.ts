export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  id: number;
  name?: string;
  description?: string;
}
