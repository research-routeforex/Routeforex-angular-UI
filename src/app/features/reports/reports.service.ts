import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { ClientWiseRevenueReport } from './client-wise-revenue.model';
import { PnlZoneReport } from './pnl-mis.model';
import { ReportUcFilters, ReportUcRow } from './report-uc.model';

/** Reports module data access. */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly api = inject(ApiService);

  /** Client-wise revenue pivot for a financial year, e.g. "2025-2026". */
  getClientWiseRevenue(faYear: string): Observable<ClientWiseRevenueReport> {
    return this.api.get<ClientWiseRevenueReport>(API.reports.clientWiseRevenue, {
      params: { faYear },
    });
  }

  /** PNL MIS zone report (As-on / MTD / YTD) for a To Date (YYYY-MM-DD). */
  getPnlMis(toDate: string): Observable<PnlZoneReport> {
    return this.api.get<PnlZoneReport>(API.reports.pnlMis, { params: { toDate } });
  }

  /** Executive Dashboard UC report rows (all filters optional). */
  getReportUc(filters: ReportUcFilters): Observable<ReportUcRow[]> {
    const params: Record<string, string | number> = {};
    if (filters.clientId != null) params['clientId'] = filters.clientId;
    if (filters.transactionType) params['transactionType'] = filters.transactionType;
    if (filters.importExport) params['importExport'] = filters.importExport;
    return this.api
      .get<ReportUcRow[]>(API.reports.executiveDashboardUc, { params })
      .pipe(map((rows) => rows ?? []));
  }
}
