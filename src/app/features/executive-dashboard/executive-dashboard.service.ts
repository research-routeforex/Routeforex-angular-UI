import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiResponse } from '../../core/models/api-response.model';
import { ApiService } from '../../core/services/api.service';
import {
  ExecutiveDashboardRow,
  ExecutiveDealDetail,
  ExecutiveDealRequest,
  ExecutiveUcRequest,
  Section,
} from './executive-dashboard.models';

/**
 * Backs the Executive Dashboard. Loads deal rows for a client + section from
 * `usp_RF_ExecutiveDashboard_Search` and exposes them plus load state. (The client
 * picker is bound separately via the common USP_RF_BINDDROPDOWN @Type='Client'.)
 */
@Injectable({ providedIn: 'root' })
export class ExecutiveDashboardService {
  private readonly api = inject(ApiService);

  private readonly _rows = signal<ExecutiveDashboardRow[]>([]);
  readonly rows = this._rows.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  private readonly _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  private readonly _lastUpdated = signal<Date | null>(null);
  readonly lastUpdated = this._lastUpdated.asReadonly();

  /**
   * Fetch deal rows for a client and section. Pass <c>silent</c> for background
   * polling: it skips the loading state and keeps the current data on error.
   */
  load(clientId: number, type: Section, silent = false): void {
    if (!silent) {
      this._loading.set(true);
      this._loaded.set(false);
    }
    this.api
      .get<ExecutiveDashboardRow[]>(API.executiveDashboard.transactions, {
        params: { clientId, type },
        context: silent ? silentContext() : undefined,
      })
      .subscribe({
        next: (rows) => {
          this._rows.set(rows ?? []);
          this._lastUpdated.set(new Date());
          this._loaded.set(true);
          this._loading.set(false);
        },
        error: () => {
          if (!silent) this._rows.set([]);
          this._loaded.set(true);
          this._loading.set(false);
        },
      });
  }

  /** Loads one deal's editable fields for the View / Edit form. */
  getDeal(id: number): Observable<ExecutiveDealDetail> {
    return this.api.get<ExecutiveDealDetail>(API.executiveDashboard.byId(id));
  }

  /** Records a Utilization / Cancellation against a deal; returns the API envelope. */
  saveUc(request: ExecutiveUcRequest): Observable<ApiResponse<unknown>> {
    return this.api.postRaw<unknown>(API.executiveDashboard.uc, request);
  }

  /** Adds a new Import / Export deal; returns the API envelope. */
  saveDeal(request: ExecutiveDealRequest): Observable<ApiResponse<unknown>> {
    return this.api.postRaw<unknown>(API.executiveDashboard.transactions, request);
  }

  /** Reset to the initial "no client selected" state. */
  clear(): void {
    this._rows.set([]);
    this._loaded.set(false);
    this._lastUpdated.set(null);
  }
}
