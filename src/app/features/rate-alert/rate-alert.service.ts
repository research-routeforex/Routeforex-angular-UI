import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { RateAlert, SaveRateAlert } from './rate-alert.model';

interface CurrencyApi {
  id: string;
  name: string;
}
interface ValidityApi {
  id: number;
  name: string;
}

/** Rate Alert data — currency/validity lookups, list search, save. */
@Injectable({ providedIn: 'root' })
export class RateAlertService {
  private readonly api = inject(ApiService);

  /** Currency-pair options (value = pair text, e.g. "USD / INR"). */
  getCurrencyOptions(): Observable<SelectOption[]> {
    return this.api
      .get<CurrencyApi[]>(API.rateAlert.currencies)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** Validity-of-alert options (value = AlertID). */
  getValidityOptions(): Observable<SelectOption[]> {
    return this.api
      .get<ValidityApi[]>(API.rateAlert.validities)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** List / search by optional text (currency / alert-me-when) and/or status. */
  search(searchText?: string | null, status?: string | null): Observable<RateAlert[]> {
    return this.api
      .get<RateAlert[]>(API.rateAlert.base, {
        params: { search: searchText || undefined, status: status || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveRateAlert): Observable<number> {
    return this.api.post<number>(API.rateAlert.base, payload);
  }
}
