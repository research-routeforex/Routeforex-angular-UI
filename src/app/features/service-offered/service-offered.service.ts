import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SaveServiceOffered, ServiceOffered } from './service-offered.model';

/** Service Offered Master data — list search + insert/update. */
@Injectable({ providedIn: 'root' })
export class ServiceOfferedService {
  private readonly api = inject(ApiService);

  /** List / search by optional name, description and/or status. */
  search(
    serviceName?: string | null,
    serviceDescription?: string | null,
    status?: string | null,
  ): Observable<ServiceOffered[]> {
    return this.api
      .get<ServiceOffered[]>(API.serviceOffered.base, {
        params: {
          serviceName: serviceName || undefined,
          serviceDescription: serviceDescription || undefined,
          status: status || undefined,
        },
      })
      .pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveServiceOffered): Observable<number> {
    return this.api.post<number>(API.serviceOffered.base, payload);
  }
}
