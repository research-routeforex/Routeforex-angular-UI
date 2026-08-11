import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { SaveUserCompanyMapping, UserCompanyMapping } from './user-company-mapping.model';

interface UserOptionApi {
  id: string;
  name: string;
}
interface ClientOptionApi {
  id: number;
  name: string;
}

/** User Company Mapping data — lookups, list search, mapped clients, save. */
@Injectable({ providedIn: 'root' })
export class UserCompanyMappingService {
  private readonly api = inject(ApiService);

  /** User dropdown options (value = UserID string). */
  getUserOptions(): Observable<SelectOption[]> {
    return this.api
      .get<UserOptionApi[]>(API.userCompanyMapping.users)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** Client (company) options (value = ClientID number). */
  getClientOptions(): Observable<SelectOption[]> {
    return this.api
      .get<ClientOptionApi[]>(API.userCompanyMapping.clients)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.id, label: r.name }))));
  }

  /** List / search by optional user and/or client. */
  search(userId?: string | null, clientId?: number | null): Observable<UserCompanyMapping[]> {
    return this.api
      .get<UserCompanyMapping[]>(API.userCompanyMapping.base, {
        params: { userId: userId || undefined, clientId: clientId ?? undefined },
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Client ids currently mapped to a user (edit form pre-check). */
  getMappedClientIds(userId: string): Observable<number[]> {
    return this.api
      .get<number[]>(API.userCompanyMapping.mappedClients(userId))
      .pipe(map((ids) => ids ?? []));
  }

  save(payload: SaveUserCompanyMapping): Observable<number> {
    return this.api.post<number>(API.userCompanyMapping.base, payload);
  }
}
