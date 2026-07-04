import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { Company, SaveCompany } from './company-master.model';

/** Company Master data — CRUD over the CompanyMaster endpoints. */
@Injectable({ providedIn: 'root' })
export class CompanyMasterService {
  private readonly api = inject(ApiService);

  getCompanies(): Observable<Company[]> {
    return this.api.get<Company[]>(API.company.base).pipe(map((rows) => rows ?? []));
  }

  getCompany(id: number): Observable<Company> {
    return this.api.get<Company>(API.company.byId(id));
  }

  saveCompany(payload: SaveCompany): Observable<number> {
    return this.api.post<number>(API.company.base, payload);
  }

  deleteCompany(id: number): Observable<void> {
    return this.api.delete<void>(API.company.byId(id));
  }
}
