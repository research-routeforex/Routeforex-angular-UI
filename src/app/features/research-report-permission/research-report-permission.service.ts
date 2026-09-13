import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { ResearchPermissionRow, SaveResearchPermission } from './research-report-permission.model';

/**
 * Research Report Permission master data — search + insert/update the client
 * grants that unlock paid research types (currently Premium) on the public
 * /publications/research report page.
 */
@Injectable({ providedIn: 'root' })
export class ResearchReportPermissionService {
  private readonly api = inject(ApiService);

  /** Search grants by optional Client and/or validity bounds (yyyy-MM-dd). */
  search(
    clientId: number | null,
    validityFrom: string | null,
    validityTo: string | null,
  ): Observable<ResearchPermissionRow[]> {
    return this.api
      .get<ResearchPermissionRow[]>(API.researchReportPermission.base, {
        params: {
          clientId: clientId ?? undefined,
          validityFrom: validityFrom || undefined,
          validityTo: validityTo || undefined,
        },
      })
      .pipe(map((rows) => rows ?? []));
  }

  save(payload: SaveResearchPermission): Observable<number> {
    return this.api.post<number>(API.researchReportPermission.base, payload);
  }
}
