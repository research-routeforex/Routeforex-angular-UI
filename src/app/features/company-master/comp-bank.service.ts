import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { CompBank, SaveCompBank } from './comp-bank.model';

/** Company Bank Master data — CRUD over the CompBank endpoints. */
@Injectable({ providedIn: 'root' })
export class CompBankService {
  private readonly api = inject(ApiService);

  getCompBanks(): Observable<CompBank[]> {
    return this.api.get<CompBank[]>(API.compBank.base).pipe(map((rows) => rows ?? []));
  }

  getCompBank(id: number): Observable<CompBank> {
    return this.api.get<CompBank>(API.compBank.byId(id));
  }

  saveCompBank(payload: SaveCompBank): Observable<number> {
    return this.api.post<number>(API.compBank.base, payload);
  }

  deleteCompBank(id: number): Observable<void> {
    return this.api.delete<void>(API.compBank.byId(id));
  }
}
