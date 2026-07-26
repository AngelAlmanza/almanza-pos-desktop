export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
