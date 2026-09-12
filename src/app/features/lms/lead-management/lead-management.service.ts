import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../../core/constants/api-endpoints';
import { ApiService } from '../../../core/services/api.service';
import { SelectOption } from '../../../shared/components/select/select';
import { LmsLead, SaveLmsLead } from './lead-management.model';

interface ClientApi {
  id: number;
  name: string;
}

/** LMS Lead Management data — client lookup, list search, save. */
@Injectable({ providedIn: 'root' })
export class LeadManagementService {
  private readonly api = inject(ApiService);

  /** Client dropdown options (LMS clients). */
  getClientOptions(): Observable<SelectOption[]> {
    return this.api
      .get<ClientApi[]>(API.lmsLead.clients)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** List / search by optional client name. */
  search(searchText?: string | null): Observable<LmsLead[]> {
    return this.api
      .get<LmsLead[]>(API.lmsLead.base, { params: { search: searchText || undefined } })
      .pipe(map((rows) => rows ?? []));
  }

  /** Add or update a lead (id = 0 → add). */
  save(payload: SaveLmsLead): Observable<number> {
    return this.api.post<number>(API.lmsLead.base, payload);
  }
}
