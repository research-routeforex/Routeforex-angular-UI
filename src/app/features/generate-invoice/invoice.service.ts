import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import {
  GeneratedInvoice,
  InvoiceDocument,
  InvoiceFooter,
  InvoiceLine,
  SaveInvoice,
  SaveInvoiceResult,
} from './invoice.model';

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

  /** Persist the invoice (header + details); returns the new id + computed tax breakdown. */
  saveInvoice(payload: SaveInvoice): Observable<SaveInvoiceResult> {
    return this.api.post<SaveInvoiceResult>(API.transaction.invoiceSave, payload);
  }

  /** Bank + contact details for the invoice footer. */
  getFooter(): Observable<InvoiceFooter> {
    return this.api.get<InvoiceFooter>(API.transaction.invoiceFooter);
  }

  /** Already-generated invoices for the history grid. `clientId` optional (omit = all clients). */
  getGeneratedInvoices(
    fromDate: string,
    toDate: string,
    clientId?: number | null,
  ): Observable<GeneratedInvoice[]> {
    const params: Record<string, string | number> = { fromDate, toDate };
    if (clientId != null) params['clientId'] = clientId;
    return this.api
      .get<GeneratedInvoice[]>(API.transaction.invoiceGenerated, { params })
      .pipe(map((rows) => rows ?? []));
  }

  /** Rebuild a saved invoice (header + lines) for re-print. */
  getInvoice(id: number): Observable<InvoiceDocument> {
    return this.api.get<InvoiceDocument>(API.transaction.invoiceById(id));
  }

  /** E-mail a saved invoice to the client; returns the number of recipients. */
  emailInvoice(id: number): Observable<number> {
    return this.api.post<number>(API.transaction.invoiceEmail(id), {});
  }
}
