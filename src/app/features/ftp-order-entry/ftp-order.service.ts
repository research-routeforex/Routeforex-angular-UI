import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { PagedResult, PaginationRequest } from '../../core/models/pagination.model';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ClientOrder,
  ForwardDeal,
  FtpOrderDetail,
  FtpOrderListFilter,
  FtpOrderListItem,
} from './ftp-order.model';

/** localStorage prefix for cached order pages (bump the suffix to invalidate). */
const ORDERS_CACHE_PREFIX = 'rf_ftp_orders_v1:';

/** FTP Order Entry — list orders + book a new order into TFTPO_Txn_OrderBooking. */
@Injectable({ providedIn: 'root' })
export class FtpOrderService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  /**
   * A page of orders, with a **fallback** cache. The last successful, non-empty page is
   * saved to localStorage (keyed per user + page + filters). If a later request fails
   * (server unreachable), that cached page is returned instead of a blank grid; when the
   * server responds normally its result is used (and re-cached), so nothing goes stale
   * while the server is up. With no cache to fall back on, the original error propagates
   * so the caller still shows its "could not load" message.
   */
  getPaged(
    request: PaginationRequest,
    filter?: FtpOrderListFilter,
  ): Observable<PagedResult<FtpOrderListItem>> {
    const key = this.cacheKey(request, filter);
    return this.api
      .getPaged<FtpOrderListItem>(API.transaction.ftpOrders, {
        params: {
          pageNumber: request.pageNumber,
          pageSize: request.pageSize,
          search: request.search ?? undefined,
          orderNumber: filter?.orderNumber || undefined,
          client: filter?.client || undefined,
          transactionType: filter?.transactionType || undefined,
          impExp: filter?.impExp || undefined,
          currency: filter?.currency || undefined,
          amount: filter?.amount || undefined,
          maturity: filter?.maturity || undefined,
          status: filter?.status || undefined,
          createdDateTime: filter?.createdDateTime || undefined,
          upcomingDate: filter?.upcomingDate || undefined,
        },
      })
      .pipe(
        tap((res) => {
          if (res?.items?.length) this.writeCache(key, res);
        }),
        catchError((err) => {
          const cached = this.readCache(key);
          return cached ? of(cached) : throwError(() => err);
        }),
      );
  }

  /** Cache key scoped to the current user so one login never sees another's cached orders. */
  private cacheKey(request: PaginationRequest, filter?: FtpOrderListFilter): string {
    const uid = this.auth.user()?.userName ?? 'anon';
    return ORDERS_CACHE_PREFIX + JSON.stringify({ uid, p: request.pageNumber, s: request.pageSize, f: filter ?? {} });
  }

  /** Reads a cached order page, or null when absent/unreadable. */
  private readCache(key: string): PagedResult<FtpOrderListItem> | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data?: PagedResult<FtpOrderListItem> };
      return parsed?.data && Array.isArray(parsed.data.items) ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /** Persists an order page to the cache (best-effort; ignores quota/serialisation errors). */
  private writeCache(key: string, data: PagedResult<FtpOrderListItem>): void {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // Storage full / unavailable (private mode) — caching is best-effort.
    }
  }

  getById(recordId: number): Observable<FtpOrderDetail> {
    return this.api.get<FtpOrderDetail>(`${API.transaction.ftpOrders}/${recordId}`);
  }

  /**
   * Parent Forward deals available to cancel/utilize for a client. `recordId` is
   * passed in edit mode so the already-linked deal still appears in the list.
   */
  getForwardDeals(clientId: number, recordId?: number): Observable<ForwardDeal[]> {
    return this.api.get<ForwardDeal[]>(API.transaction.ftpForwardDeals, {
      params: { clientId, recordId: recordId || undefined },
    });
  }

  /**
   * Next working day (skips weekends + holidays) for `date` (default: today),
   * as an ISO yyyy-MM-dd string. Used to default the order's date fields.
   */
  /** All live orders for a client — Deal Coverage's Order dropdown. */
  getOrdersByClient(clientId: number): Observable<ClientOrder[]> {
    return this.api.get<ClientOrder[]>(API.transaction.ftpOrdersByClient, {
      params: { clientId },
    });
  }

  getWorkingDate(date?: string): Observable<string> {
    return this.api.get<string>(API.transaction.ftpWorkingDate, {
      params: { date: date || undefined },
    });
  }

  delete(recordId: number): Observable<unknown> {
    return this.api.delete<unknown>(`${API.transaction.ftpOrders}/${recordId}`);
  }

  /**
   * Posts the order field-map; the API serializes it to XML and calls the save
   * proc. Returns the full envelope so the UI can show the proc's message.
   */
  book(fields: Record<string, string | null>): Observable<ApiResponse<unknown>> {
    return this.api.postRaw<unknown>(API.transaction.ftpOrderBooking, fields);
  }
}
