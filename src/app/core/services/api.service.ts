import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';

/** Values accepted for query string params. */
type ParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, ParamValue>;

export interface RequestOptions {
  params?: QueryParams;
  context?: HttpContext;
}

/**
 * Thin, generic wrapper over HttpClient that:
 *  - prefixes every path with the configured base URL + API version,
 *  - unwraps the standard `ApiResponse<T>` envelope so callers work with `T`,
 *  - centralizes query-param building.
 *
 * HTTP-level errors are handled by the global error interceptor; this service
 * only deals with the happy path and envelope unwrapping.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}${environment.apiPrefix}`;

  get<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), this.httpOptions(options))
      .pipe(map((r) => r.data as T));
  }

  /** GET a paged list endpoint, returning the `PagedResult<T>` payload. */
  getPaged<T>(path: string, options?: RequestOptions): Observable<PagedResult<T>> {
    return this.http
      .get<ApiResponse<PagedResult<T>>>(this.url(path), this.httpOptions(options))
      .pipe(map((r) => r.data as PagedResult<T>));
  }

  /** Returns the full envelope (use when you need message/errors, e.g. auth). */
  getRaw<T>(path: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.url(path), this.httpOptions(options));
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body, this.httpOptions(options))
      .pipe(map((r) => r.data as T));
  }

  postRaw<T>(path: string, body: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.url(path), body, this.httpOptions(options));
  }

  put<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body, this.httpOptions(options))
      .pipe(map((r) => r.data as T));
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(this.url(path), this.httpOptions(options))
      .pipe(map((r) => r.data as T));
  }

  private url(path: string): string {
    return `${this.root}/${path.replace(/^\/+/, '')}`;
  }

  private httpOptions(options?: RequestOptions) {
    return {
      params: this.toParams(options?.params),
      context: options?.context,
    };
  }

  private toParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}
