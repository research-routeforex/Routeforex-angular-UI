import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SaveTickerLiveScreen, TickerLiveScreenRow } from './ticker-live-screen-right.model';

/**
 * Ticker Live Screen Right master data — search + insert/update the client
 * subscriptions that unlock the Ticker Live Rate screen.
 */
@Injectable({ providedIn: 'root' })
export class TickerLiveScreenRightService {
  private readonly api = inject(ApiService);

  /** Search subscriptions by optional Client and/or validity bounds (yyyy-MM-dd). */
  search(
    clientId: number | null,
    validityFrom: string | null,
    validityTo: string | null,
  ): Observable<TickerLiveScreenRow[]> {
    return this.api
      .get<TickerLiveScreenRow[]>(API.tickerLiveScreenRight.base, {
        params: {
          clientId: clientId ?? undefined,
          validityFrom: validityFrom || undefined,
          validityTo: validityTo || undefined,
        },
      })
      .pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveTickerLiveScreen): Observable<number> {
    return this.api.post<number>(API.tickerLiveScreenRight.base, payload);
  }
}
