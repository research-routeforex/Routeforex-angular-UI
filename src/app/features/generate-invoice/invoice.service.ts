import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { InvoiceLine } from './invoice.model';

/** Generate-Invoice data: orders + contract charges for a client and date range. */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly api = inject(ApiService);

  /** `fromDate` / `toDate` are yyyy-MM-dd. */
  generate(clientId: number, fromDate: string, toDate: string): Observable<InvoiceLine[]> {
    return this.api
      .get<InvoiceLine[]>(API.transaction.invoice, { params: { clientId, fromDate, toDate } })
      .pipe(map((rows) => rows ?? []));
  }

  /** Mark the range's orders as InvoiceGenerated; returns the number updated. */
  markGenerated(clientId: number, fromDate: string, toDate: string): Observable<number> {
    return this.api.post<number>(API.transaction.invoiceGenerate, { clientId, fromDate, toDate });
  }
}
