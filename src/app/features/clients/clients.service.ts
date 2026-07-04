import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { PagedResult, PaginationRequest } from '../../core/models/pagination.model';
import { ApiService } from '../../core/services/api.service';
import {
  ClientBank,
  ClientContract,
  ClientDetail,
  ClientListFilter,
  ClientListItem,
  ClientLookups,
  ContractLookups,
  LookupItem,
  SaveBankRequest,
  SaveClientRequest,
  SaveClientResult,
  SaveContractRequest,
} from './client.model';

/** Client Master API — list, lookups, get, save (insert/update), delete. */
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private static readonly base = 'Clients';

  /** Download a stored document as a Blob (auth header added by the interceptor). */
  getDocument(clientId: number, which: 'sla' | 'auth'): Observable<Blob> {
    const url = `${environment.apiBaseUrl}${environment.apiPrefix}/${ClientsService.base}/${clientId}/document/${which}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  getPaged(
    request: PaginationRequest,
    filter?: ClientListFilter,
  ): Observable<PagedResult<ClientListItem>> {
    return this.api.getPaged<ClientListItem>(ClientsService.base, {
      params: {
        pageNumber: request.pageNumber,
        pageSize: request.pageSize,
        search: request.search ?? undefined,
        sortColumn: request.sortColumn ?? undefined,
        sortDirection: request.sortDirection ?? undefined,
        clientName: filter?.clientName || undefined,
        group: filter?.group || undefined,
        location: filter?.location || undefined,
        status: filter?.status || undefined,
        onBoardDate: filter?.onBoardDate || undefined,
      },
    });
  }

  getLookups(): Observable<ClientLookups> {
    return this.api.get<ClientLookups>(`${ClientsService.base}/lookups`);
  }

  /** Countries for a region (cascade). */
  getCountries(regionId?: number | null): Observable<LookupItem[]> {
    return this.api.get<LookupItem[]>(`${ClientsService.base}/countries`, {
      params: { regionId: regionId ?? undefined },
    });
  }

  /** Cities for a country (cascade). */
  getCities(countryId?: number | null): Observable<LookupItem[]> {
    return this.api.get<LookupItem[]>(`${ClientsService.base}/cities`, {
      params: { countryId: countryId ?? undefined },
    });
  }

  getById(id: number): Observable<ClientDetail> {
    return this.api.get<ClientDetail>(`${ClientsService.base}/${id}`);
  }

  /** Returns the full envelope so the form can surface the proc's message. */
  save(payload: SaveClientRequest): Observable<ApiResponse<SaveClientResult>> {
    return this.api.postRaw<SaveClientResult>(`${ClientsService.base}/save`, payload);
  }

  delete(id: number): Observable<unknown> {
    return this.api.delete<unknown>(`${ClientsService.base}/${id}`);
  }

  // ----- Client Bank --------------------------------------------------------
  getBankOptions(cityId?: number | null): Observable<LookupItem[]> {
    return this.api.get<LookupItem[]>(`${ClientsService.base}/bank-options`, {
      params: { cityId: cityId ?? undefined },
    });
  }
  getBanks(clientId: number): Observable<ClientBank[]> {
    return this.api.get<ClientBank[]>(`${ClientsService.base}/${clientId}/banks`);
  }
  saveBank(clientId: number, payload: SaveBankRequest): Observable<number> {
    return this.api.post<number>(`${ClientsService.base}/${clientId}/banks`, payload);
  }
  deleteBank(bankId: number): Observable<unknown> {
    return this.api.delete<unknown>(`${ClientsService.base}/banks/${bankId}`);
  }

  // ----- Client Contract ----------------------------------------------------
  getContractLookups(): Observable<ContractLookups> {
    return this.api.get<ContractLookups>(`${ClientsService.base}/contract-lookups`);
  }
  getContracts(clientId: number): Observable<ClientContract[]> {
    return this.api.get<ClientContract[]>(`${ClientsService.base}/${clientId}/contracts`);
  }
  saveContract(clientId: number, payload: SaveContractRequest): Observable<number> {
    return this.api.post<number>(`${ClientsService.base}/${clientId}/contracts`, payload);
  }
  deleteContract(contractId: number): Observable<unknown> {
    return this.api.delete<unknown>(`${ClientsService.base}/contracts/${contractId}`);
  }
}
