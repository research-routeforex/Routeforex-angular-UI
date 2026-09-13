import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { Lead, UpdateLead } from './lead-master.model';

interface LeadTypeApi {
  id: string;
  name: string;
}

/** Lead Master data — type lookup, list search, edit (Status + Remarks). */
@Injectable({ providedIn: 'root' })
export class LeadMasterService {
  private readonly api = inject(ApiService);

  /** Distinct lead-type options for the filter dropdown. */
  getTypeOptions(): Observable<SelectOption[]> {
    return this.api
      .get<LeadTypeApi[]>(API.lead.types)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** List / search by optional Type and/or Status. */
  search(type?: string | null, status?: string | null): Observable<Lead[]> {
    return this.api
      .get<Lead[]>(API.lead.base, {
        params: { type: type || undefined, status: status || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Update a lead's Status + Remarks. Returns rows affected. */
  update(payload: UpdateLead): Observable<number> {
    return this.api.post<number>(API.lead.base, payload);
  }
}
