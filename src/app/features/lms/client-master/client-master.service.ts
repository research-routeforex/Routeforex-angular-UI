import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../../core/constants/api-endpoints';
import { ApiService } from '../../../core/services/api.service';
import { SelectOption } from '../../../shared/components/select/select';
import { LmsClient, LmsContact, SaveLmsClient } from './client-master.model';

interface LookupApi {
  id: number;
  name: string;
}

/** Raw client row from the API — contacts arrive as a JSON string. */
interface LmsClientApi extends Omit<LmsClient, 'contacts'> {
  contactsJson: string | null;
}

/** LMS Client Master data — cascading Region/Country/City lookups, list, save. */
@Injectable({ providedIn: 'root' })
export class LmsClientMasterService {
  private readonly api = inject(ApiService);

  getRegions(): Observable<SelectOption[]> {
    return this.api.get<LookupApi[]>(API.lmsClient.regions).pipe(map(this.toOptions));
  }

  getCountries(regionId: number | null): Observable<SelectOption[]> {
    return this.api
      .get<LookupApi[]>(API.lmsClient.countries, { params: { regionId: regionId ?? undefined } })
      .pipe(map(this.toOptions));
  }

  getCities(countryId: number | null): Observable<SelectOption[]> {
    return this.api
      .get<LookupApi[]>(API.lmsClient.cities, { params: { countryId: countryId ?? undefined } })
      .pipe(map(this.toOptions));
  }

  /** List / search by optional client name and/or status. */
  search(searchText?: string | null, status?: string | null): Observable<LmsClient[]> {
    return this.api
      .get<LmsClientApi[]>(API.lmsClient.base, {
        params: { search: searchText || undefined, status: status || undefined },
      })
      .pipe(
        map((rows) =>
          (rows ?? []).map((r) => {
            const { contactsJson, ...rest } = r;
            return { ...rest, contacts: this.parseContacts(contactsJson) } as LmsClient;
          }),
        ),
      );
  }

  private parseContacts(json: string | null): LmsContact[] {
    if (!json) return [];
    try {
      const arr = JSON.parse(json) as LmsContact[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  /** Add or update a client (clientID = 0 → add). */
  save(payload: SaveLmsClient): Observable<number> {
    return this.api.post<number>(API.lmsClient.base, payload);
  }

  private toOptions(rows: LookupApi[] | null): SelectOption[] {
    return (rows ?? []).map((r) => ({ value: r.id, label: r.name }));
  }
}
