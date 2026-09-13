import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../../core/constants/api-endpoints';
import { ApiService } from '../../../core/services/api.service';
import { SelectOption } from '../../../shared/components/select/select';
import { MeClient, SaveMeClient } from './client-information.model';

interface LookupApi {
  id: number;
  name: string;
}

/** Client Information data — cascading Region/Country/City lookups, list, save. */
@Injectable({ providedIn: 'root' })
export class ClientInformationService {
  private readonly api = inject(ApiService);

  /** Region dropdown options. */
  getRegions(): Observable<SelectOption[]> {
    return this.api.get<LookupApi[]>(API.moneyExchangeClient.regions).pipe(map(this.toOptions));
  }

  /** Country dropdown options for a region. */
  getCountries(regionId: number | null): Observable<SelectOption[]> {
    return this.api
      .get<LookupApi[]>(API.moneyExchangeClient.countries, {
        params: { regionId: regionId ?? undefined },
      })
      .pipe(map(this.toOptions));
  }

  /** City dropdown options for a country. */
  getCities(countryId: number | null): Observable<SelectOption[]> {
    return this.api
      .get<LookupApi[]>(API.moneyExchangeClient.cities, {
        params: { countryId: countryId ?? undefined },
      })
      .pipe(map(this.toOptions));
  }

  /** List / search by optional text and/or status. */
  search(searchText?: string | null, status?: string | null): Observable<MeClient[]> {
    return this.api
      .get<MeClient[]>(API.moneyExchangeClient.base, {
        params: { search: searchText || undefined, status: status || undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Add or update a client (id = 0 → add). */
  save(payload: SaveMeClient): Observable<number> {
    return this.api.post<number>(API.moneyExchangeClient.base, payload);
  }

  private toOptions(rows: LookupApi[] | null): SelectOption[] {
    return (rows ?? []).map((r) => ({ value: r.id, label: r.name }));
  }
}
