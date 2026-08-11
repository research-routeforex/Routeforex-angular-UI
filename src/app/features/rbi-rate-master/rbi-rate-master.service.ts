import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { RbiRate, SaveRbiRate } from './rbi-rate-master.model';

/** RBI Rate Master data — search + insert/update over the RbiRate endpoints. */
@Injectable({ providedIn: 'root' })
export class RbiRateMasterService {
  private readonly api = inject(ApiService);

  /** Search the list by optional Date (yyyy-MM-dd), Currency and/or Rate. */
  search(date: string | null, currency: string | null, rate: number | null): Observable<RbiRate[]> {
    return this.api
      .get<RbiRate[]>(API.rbiRate.base, {
        params: { date: date || undefined, currency: currency || undefined, rate: rate ?? undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveRbiRate): Observable<number> {
    return this.api.post<number>(API.rbiRate.base, payload);
  }
}
