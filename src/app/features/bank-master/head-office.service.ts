import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { HeadOffice, SaveHeadOffice } from './head-office.model';

/** Head Office Master data — head office + contact persons CRUD. */
@Injectable({ providedIn: 'root' })
export class HeadOfficeService {
  private readonly api = inject(ApiService);

  getHeadOffices(): Observable<HeadOffice[]> {
    return this.api.get<HeadOffice[]>(API.headOffice.base).pipe(map((rows) => rows ?? []));
  }

  getHeadOffice(id: number): Observable<HeadOffice> {
    return this.api.get<HeadOffice>(API.headOffice.byId(id));
  }

  saveHeadOffice(payload: SaveHeadOffice): Observable<number> {
    return this.api.post<number>(API.headOffice.base, payload);
  }

  deleteHeadOffice(id: number): Observable<void> {
    return this.api.delete<void>(API.headOffice.byId(id));
  }
}
