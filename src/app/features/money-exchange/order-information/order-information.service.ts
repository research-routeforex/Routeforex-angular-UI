import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../../core/constants/api-endpoints';
import { ApiService } from '../../../core/services/api.service';
import { MeOrder, SaveMeOrder } from './order-information.model';

/** Order Information data — list search, save. */
@Injectable({ providedIn: 'root' })
export class OrderInformationService {
  private readonly api = inject(ApiService);

  /** List / search by optional text and/or status. */
  search(searchText?: string | null, status?: string | null): Observable<MeOrder[]> {
    return this.api
      .get<MeOrder[]>(API.moneyExchangeOrder.base, {
        params: { search: searchText || undefined, status: status || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Add or update an order (recordID = 0 → add). */
  save(payload: SaveMeOrder): Observable<number> {
    return this.api.post<number>(API.moneyExchangeOrder.base, payload);
  }
}
