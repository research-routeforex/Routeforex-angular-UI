import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { ForexAdvisory, SaveForexAdvisory } from './forex-advisory.model';

interface CurrencyApi {
  id: string;
  name: string;
}

/** Forex Advisory data — currency lookup, list search, save. */
@Injectable({ providedIn: 'root' })
export class ForexAdvisoryService {
  private readonly api = inject(ApiService);

  /** Currency-dropdown options (active TF currencies; value = currencyName). */
  getCurrencyOptions(): Observable<SelectOption[]> {
    return this.api
      .get<CurrencyApi[]>(API.forexAdvisory.currencies)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** List / search by optional Currency and/or Status. */
  search(currency?: string | null, status?: string | null): Observable<ForexAdvisory[]> {
    return this.api
      .get<ForexAdvisory[]>(API.forexAdvisory.base, {
        params: { currency: currency || undefined, status: status || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Add or update an advisory (recordID = 0 → add). */
  save(payload: SaveForexAdvisory): Observable<number> {
    return this.api.post<number>(API.forexAdvisory.base, payload);
  }
}
