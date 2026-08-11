import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { OtherService, SaveOtherService } from './other-services.model';

interface OptionApi {
  id: number;
  name: string;
}

/** Other Services master data — service lookups, list search, save, delete. */
@Injectable({ providedIn: 'root' })
export class OtherServicesService {
  private readonly api = inject(ApiService);

  /** Service dropdown options for the add form. */
  getServiceOptions(): Observable<SelectOption[]> {
    return this.api
      .get<OptionApi[]>(API.otherServices.services)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** List / search by optional client and/or date (yyyy-MM-dd). */
  search(clientId?: number | null, date?: string | null): Observable<OtherService[]> {
    return this.api
      .get<OtherService[]>(API.otherServices.base, {
        params: { clientId: clientId ?? undefined, date: date || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveOtherService): Observable<number> {
    return this.api.post<number>(API.otherServices.base, payload);
  }

  delete(id: number): Observable<unknown> {
    return this.api.delete<unknown>(API.otherServices.byId(id));
  }
}
