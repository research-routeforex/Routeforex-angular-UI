import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiResponse } from '../../core/models/api-response.model';
import { ApiService } from '../../core/services/api.service';
import { HistoricalRate, HistoricalRateUploadResult } from './historical-rate-master.model';

/** Historical Rate Master data — list search + Excel bulk upload. */
@Injectable({ providedIn: 'root' })
export class HistoricalRateMasterService {
  private readonly api = inject(ApiService);

  /** Search the list by optional Date (yyyy-MM-dd) and/or Currency. */
  search(date: string | null, currency: string | null): Observable<HistoricalRate[]> {
    return this.api
      .get<HistoricalRate[]>(API.historicalRate.base, {
        params: { date: date || undefined, currency: currency || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /**
   * Upload an Excel (.xlsx) file (sent as a base64 data-URL). Returns the full
   * envelope so the caller can surface the server's inserted-count / error message.
   */
  upload(fileName: string, fileBase64: string): Observable<ApiResponse<HistoricalRateUploadResult>> {
    return this.api.postRaw<HistoricalRateUploadResult>(API.historicalRate.upload, {
      fileName,
      fileBase64,
    });
  }
}
