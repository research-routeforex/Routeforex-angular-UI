/** Sort direction matching the backend `SortDirection` enum. */
export type SortDirection = 'Asc' | 'Desc';

/**
 * Query parameters for list endpoints — paging, free-text search and sorting.
 * @see RouteForex.Application.Common.Models.PaginationRequest
 */
export interface PaginationRequest {
  pageNumber: number;
  pageSize: number;
  search?: string | null;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
}

/**
 * A page of results plus paging metadata.
 * @see RouteForex.Application.Common.Models.PagedResult
 */
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const emptyPage = <T>(pageSize = 20): PagedResult<T> => ({
  items: [],
  pageNumber: 1,
  pageSize,
  totalCount: 0,
  totalPages: 0,
  hasPrevious: false,
  hasNext: false,
});
