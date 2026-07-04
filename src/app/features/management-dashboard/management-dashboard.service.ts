import { inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiService } from '../../core/services/api.service';
import { SelectOption } from '../../shared/components/select/select';
import { DashboardLeaf, DashboardRowApi, Section, toLeaf } from './management-dashboard.models';

/** Key/value client row from GetClientInformation. */
interface ClientItemApi {
  key: unknown;
  value: string;
}

/**
 * Backs the Management Dashboard. Loads transactions for a client + section from
 * `Proc_RF_ManagementDashboard` and exposes them as leaf rows plus load state.
 * Mark-to-market is provided by the proc, so there is no client-side live feed.
 */
@Injectable({ providedIn: 'root' })
export class ManagementDashboardService {
  private readonly api = inject(ApiService);

  /** Leaves for the most recent (client, section) load. */
  private readonly _leaves = signal<DashboardLeaf[]>([]);
  readonly leaves = this._leaves.asReadonly();

  /** True while a fetch is in flight. */
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  /** True once a load has completed (so an empty result shows "no data", not "pick a client"). */
  private readonly _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  /** Timestamp of the last successful load (drives the "as of" indicator). */
  private readonly _lastUpdated = signal<Date | null>(null);
  readonly lastUpdated = this._lastUpdated.asReadonly();

  /**
   * Client list for the picker, from Proc_RF_ManagementDashboard
   * (@Action = 'GetClientInformation', @CreatedBy = signed-in user — resolved
   * server-side). Mapped to {@link SelectOption} ({ value, label }).
   */
  getClients(): Observable<SelectOption[]> {
    return this.api
      .get<ClientItemApi[]>(API.managementDashboard.clients)
      .pipe(map((rows) => (rows ?? []).map((r) => ({ value: r.key, label: r.value }))));
  }

  /**
   * Fetch transactions for a client and section. Pass <c>silent</c> for the
   * 2-second background poll: it skips the loading state and, on error, keeps the
   * data already on screen rather than blanking it.
   */
  load(clientId: number, type: Section, silent = false): void {
    if (!silent) {
      this._loading.set(true);
      this._loaded.set(false);
    }
    this.api
      .get<DashboardRowApi[]>(API.managementDashboard.transactions, {
        params: { clientId, type },
        context: silent ? silentContext() : undefined,
      })
      .subscribe({
        next: (rows) => {
          this._leaves.set((rows ?? []).map(toLeaf));
          this._lastUpdated.set(new Date());
          this._loaded.set(true);
          this._loading.set(false);
        },
        error: () => {
          if (!silent) this._leaves.set([]);
          this._loaded.set(true);
          this._loading.set(false);
        },
      });
  }

  /** Reset to the initial "no client selected" state. */
  clear(): void {
    this._leaves.set([]);
    this._loaded.set(false);
    this._lastUpdated.set(null);
  }
}
