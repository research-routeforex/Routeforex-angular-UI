import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { Currency, SaveCurrency } from './currency-master.model';

/** Currency Master data — CRUD over the CurrencyMaster endpoints. */
@Injectable({ providedIn: 'root' })
export class CurrencyMasterService {
  private readonly api = inject(ApiService);

  getCurrencies(): Observable<Currency[]> {
    return this.api.get<Currency[]>(API.commonMaster.currency).pipe(map((rows) => rows ?? []));
  }

  saveCurrency(payload: SaveCurrency): Observable<number> {
    return this.api.post<number>(API.commonMaster.currency, payload);
  }

  deleteCurrency(id: number): Observable<void> {
    return this.api.delete<void>(API.commonMaster.currencyById(id));
  }
}
