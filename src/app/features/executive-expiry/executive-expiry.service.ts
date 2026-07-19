import { inject, Injectable, signal } from '@angular/core';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiService } from '../../core/services/api.service';
import { ExecutiveDashboardRow, Section } from '../executive-dashboard/executive-dashboard.models';

/**
 * Backs the Executive Expiry Transaction screen. Loads read-only Import / Export
 * expiry rows for a client + section from `usp_RF_ExecutiveDashboard_ExpiryTransaction`.
 * Rows share the Executive Dashboard shape (ExecutiveDashboardRow); this screen only
 * displays them — no add / edit / utilization actions.
 */
@Injectable({ providedIn: 'root' })
export class ExecutiveExpiryService {
  private readonly api = inject(ApiService);

  private readonly _rows = signal<ExecutiveDashboardRow[]>([]);
  readonly rows = this._rows.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  private readonly _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  /** Fetch expiry rows for a client and section. */
  load(clientId: number, type: Section, silent = false): void {
    if (!silent) {
      this._loading.set(true);
      this._loaded.set(false);
    }
    this.api
      .get<ExecutiveDashboardRow[]>(API.executiveDashboard.expiry, {
        params: { clientId, type },
        context: silent ? silentContext() : undefined,
      })
      .subscribe({
        next: (rows) => {
          this._rows.set(rows ?? []);
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

  /** Reset to the initial "no client selected" state. */
  clear(): void {
    this._rows.set([]);
    this._loaded.set(false);
  }
}
