import { inject, Injectable } from '@angular/core';
import { catchError, concat, filter, map, Observable, of, tap } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiService } from '../../core/services/api.service';
import {
  mapReport,
  ResearchReport,
  ResearchReportDetail,
  ResearchReportDetailDto,
  ResearchReportDto,
} from './research.data';

/** localStorage key for the cached report list (bump the suffix to invalidate). */
const REPORTS_CACHE_KEY = 'rf_research_reports_v1';

/** Public research publications — gallery list + single report detail. */
@Injectable({ providedIn: 'root' })
export class ResearchService {
  private readonly api = inject(ApiService);

  /**
   * All published reports (newest first), with a stale-while-revalidate cache.
   *
   *  - If a cached list exists it is emitted **immediately** (instant render, no blank
   *    page) and the server is still queried in the background to refresh it.
   *  - A successful non-empty response replaces the list and updates the cache.
   *  - If the server errors or returns nothing, the cached list stays on screen — so
   *    "no research loaded" falls back to the cache instead of an empty gallery.
   *  - With no cache at all, it simply loads from the server (caching on success).
   */
  getReports(): Observable<ResearchReport[]> {
    const cached = this.readCache();

    const network$ = this.api.get<ResearchReportDto[]>(API.research.base).pipe(
      map((rows) => (rows ?? []).map(mapReport)),
      tap((list) => {
        if (list.length) this.writeCache(list);
      }),
      // Network failure → emit an empty list; whether that's shown depends on the cache.
      catchError(() => of<ResearchReport[]>([])),
    );

    if (cached?.length) {
      // Show cache first, then only overwrite it with a *non-empty* fresh response.
      return concat(of(cached), network$.pipe(filter((list) => list.length > 0)));
    }
    // No cache: go straight to the network (empty result shows the "no reports" state).
    return network$;
  }

  /** Reads the cached report list, or null when absent/unreadable. */
  private readCache(): ResearchReport[] | null {
    try {
      const raw = localStorage.getItem(REPORTS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data?: ResearchReport[] };
      return Array.isArray(parsed?.data) && parsed.data.length ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /** Persists the report list to the cache (best-effort; ignores quota/serialisation errors). */
  private writeCache(data: ResearchReport[]): void {
    try {
      localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // Storage full / unavailable (private mode) — caching is best-effort.
    }
  }

  /** A single published report plus its HTML body. */
  getReport(id: number): Observable<ResearchReportDetail> {
    return this.api
      .get<ResearchReportDetailDto>(API.research.byId(id))
      .pipe(map((dto) => ({ ...mapReport(dto), content: dto.content ?? '' })));
  }

  /**
   * Whether the signed-in user may view a paid research type (default Premium).
   * Admin → always; other users → a live grant on a mapped client. Any error
   * (e.g. expired session) resolves to `false` so the report stays gated.
   */
  hasAccess(type: string = 'P'): Observable<boolean> {
    return this.api
      .get<{ allowed: boolean }>(API.researchReportPermission.access, {
        params: { type },
        context: silentContext(),
      })
      .pipe(
        map((r) => !!r?.allowed),
        catchError(() => of(false)),
      );
  }
}
