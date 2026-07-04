import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { Bank, SaveBank } from './bank-master.model';

/** Bank Master data — bank + RM contacts CRUD over the Bank endpoints. */
@Injectable({ providedIn: 'root' })
export class BankMasterService {
  private readonly api = inject(ApiService);

  getBanks(): Observable<Bank[]> {
    return this.api.get<Bank[]>(API.bank.base).pipe(map((rows) => rows ?? []));
  }

  getBank(id: number): Observable<Bank> {
    return this.api.get<Bank>(API.bank.byId(id));
  }

  saveBank(payload: SaveBank): Observable<number> {
    return this.api.post<number>(API.bank.base, payload);
  }

  deleteBank(id: number): Observable<void> {
    return this.api.delete<void>(API.bank.byId(id));
  }
}
