import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { PagedResult, PaginationRequest } from '../../core/models/pagination.model';
import { ApiService } from '../../core/services/api.service';
import { FtpOrderDetail, FtpOrderListFilter, FtpOrderListItem } from './ftp-order.model';

/** FTP Order Entry — list orders + book a new order into TFTPO_Txn_OrderBooking. */
@Injectable({ providedIn: 'root' })
export class FtpOrderService {
  private readonly api = inject(ApiService);

  getPaged(
    request: PaginationRequest,
    filter?: FtpOrderListFilter,
  ): Observable<PagedResult<FtpOrderListItem>> {
    return this.api.getPaged<FtpOrderListItem>(API.transaction.ftpOrders, {
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
      },
    });
  }

  getById(recordId: number): Observable<FtpOrderDetail> {
    return this.api.get<FtpOrderDetail>(`${API.transaction.ftpOrders}/${recordId}`);
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
