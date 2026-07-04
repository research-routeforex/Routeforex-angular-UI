import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../components/select/select';

interface DropdownItemApi {
  key: unknown;
  value: string;
}

/**
 * Reusable key/value dropdown source backed by the common USP_RF_BINDDROPDOWN
 * proc (GET /api/v1/Dropdowns?type=&clientId=). Maps the API's {key,value} rows
 * to {@link SelectOption} ({ value, label }) ready for <app-select>.
 *
 *   dropdowns.get('TransactionType')
 *   dropdowns.get('Currency')
 *   dropdowns.get('Bank', clientId)
 */
@Injectable({ providedIn: 'root' })
export class DropdownService {
  private readonly api = inject(ApiService);

  get(type: string, clientId?: number): Observable<SelectOption[]> {
    return this.api
      .get<DropdownItemApi[]>(API.forex.dropdowns, {
        params: { type, clientId },
        context: silentContext(),
      })
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.key, label: r.value }))));
  }
}
