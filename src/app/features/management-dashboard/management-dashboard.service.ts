import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, Observable, of, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
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

/** A single grid-load request pushed through the (latest-wins) fetch pipeline. */
interface LoadRequest {
  clientId: number;
  type: Section;
  bankId: number | null;
  silent: boolean;
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
   * True while a fetch is in flight (silent polls included). The poll uses this to
   * avoid stacking a new request on top of one that hasn't returned yet.
   */
  private readonly _fetching = signal(false);
  readonly fetching = this._fetching.asReadonly();

  /**
   * All grid loads flow through this stream. `switchMap` cancels any in-flight
   * request when a newer one arrives, so a slow response for a *previous* client,
   * section or bank can never overwrite the current selection's data (latest-wins).
   */
  private readonly _load$ = new Subject<LoadRequest>();

  constructor() {
    this._load$
      .pipe(
        tap((req) => {
          this._fetching.set(true);
          if (!req.silent) {
            this._loading.set(true);
            this._loaded.set(false);
          }
        }),
        switchMap((req) =>
          this.api
            .get<DashboardRowApi[]>(API.managementDashboard.transactions, {
              params: { clientId: req.clientId, type: req.type, clientBank: req.bankId ?? undefined },
              context: req.silent ? silentContext() : undefined,
            })
            .pipe(
              map((rows) => ({ req, rows: rows ?? [], ok: true })),
              // Keep the pipeline alive on error so later polls still fire.
              catchError(() => of({ req, rows: [] as DashboardRowApi[], ok: false })),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ req, rows, ok }) => {
        if (ok) {
          this._leaves.set(rows.map(toLeaf));
          this._lastUpdated.set(new Date());
        } else if (!req.silent) {
          this._leaves.set([]);
        }
        this._loaded.set(true);
        this._loading.set(false);
        this._fetching.set(false);
      });
  }

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
  load(clientId: number, type: Section, bankId: number | null = null, silent = false): void {
    this._load$.next({ clientId, type, bankId, silent });
  }

  /** Reset to the initial "no client selected" state. */
  clear(): void {
    this._leaves.set([]);
    this._loaded.set(false);
    this._lastUpdated.set(null);
    this._loading.set(false);
    this._fetching.set(false);
  }
}
