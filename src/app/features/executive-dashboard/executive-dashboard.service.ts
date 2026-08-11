import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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

/** A single grid-load request pushed through the (latest-wins) fetch pipeline. */
interface LoadRequest {
  clientId: number;
  type: Section;
  silent: boolean;
}

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
   * True while a fetch is in flight (silent polls included). Callers use this to
   * avoid stacking a new poll on top of one that hasn't returned yet.
   */
  private readonly _fetching = signal(false);
  readonly fetching = this._fetching.asReadonly();

  /**
   * All grid loads flow through this stream. `switchMap` cancels any in-flight
   * request when a newer one arrives, so a slow response for a *previous* client
   * or section can never overwrite the current selection's data (latest-wins).
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
            .get<ExecutiveDashboardRow[]>(API.executiveDashboard.transactions, {
              params: { clientId: req.clientId, type: req.type },
              context: req.silent ? silentContext() : undefined,
            })
            .pipe(
              map((rows) => ({ req, rows: rows ?? [], ok: true })),
              // Keep the pipeline alive on error so later polls still fire.
              catchError(() => of({ req, rows: [] as ExecutiveDashboardRow[], ok: false })),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ req, rows, ok }) => {
        if (ok) {
          this._rows.set(rows);
          this._lastUpdated.set(new Date());
        } else if (!req.silent) {
          this._rows.set([]);
        }
        this._loaded.set(true);
        this._loading.set(false);
        this._fetching.set(false);
      });
  }

  /**
   * Fetch deal rows for a client and section. Pass <c>silent</c> for background
   * polling: it skips the loading state and keeps the current data on error.
   * Requests are serialized latest-wins — a newer load cancels an older in-flight one.
   */
  load(clientId: number, type: Section, silent = false): void {
    this._load$.next({ clientId, type, silent });
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
    this._loading.set(false);
    this._fetching.set(false);
  }
}
