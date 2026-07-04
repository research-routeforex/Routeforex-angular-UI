import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, PaginationRequest } from '../models/pagination.model';
import { ApiService, QueryParams } from './api.service';

/**
 * Reusable base for master-data CRUD services. Concrete services supply the
 * controller `basePath` (e.g. `'Cities'`) and inherit standard paged-list +
 * single-item + create/update/delete operations against the standard envelope.
 */
export abstract class CrudService<TDto, TCreate, TUpdate, TKey = number> {
  protected readonly api = inject(ApiService);

  /** Controller segment relative to the API prefix, e.g. `'Cities'`. */
  protected abstract readonly basePath: string;

  getPaged(request: PaginationRequest): Observable<PagedResult<TDto>> {
    return this.api.getPaged<TDto>(this.basePath, { params: this.pageParams(request) });
  }

  getById(id: TKey): Observable<TDto> {
    return this.api.get<TDto>(`${this.basePath}/${id}`);
  }

  /** Create returns the new resource id. */
  create(payload: TCreate): Observable<TKey> {
    return this.api.post<TKey>(this.basePath, payload);
  }

  update(id: TKey, payload: TUpdate): Observable<void> {
    return this.api.put<void>(`${this.basePath}/${id}`, payload);
  }

  delete(id: TKey): Observable<void> {
    return this.api.delete<void>(`${this.basePath}/${id}`);
  }

  protected pageParams(request: PaginationRequest): QueryParams {
    return {
      pageNumber: request.pageNumber,
      pageSize: request.pageSize,
      search: request.search ?? undefined,
      sortColumn: request.sortColumn ?? undefined,
      sortDirection: request.sortDirection ?? undefined,
    };
  }
}
