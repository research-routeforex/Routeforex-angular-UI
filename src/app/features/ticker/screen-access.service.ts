import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiService } from '../../core/services/api.service';

/** Daily metered access for a screen. `allowedMinutes` null = unlimited. */
export interface ScreenAccess {
  allowedMinutes: number | null;
  usedSeconds: number;
}

/**
 * Reads/records metered screen-access (daily minute budget). Backed by
 * ScreenAccessController; the server owns the allowance rule (e.g. 15 min for
 * admin) so the client only enforces the countdown and reports elapsed time.
 */
@Injectable({ providedIn: 'root' })
export class ScreenAccessService {
  private readonly api = inject(ApiService);

  /** Allowance + seconds used today for the given screen route. */
  get(route: string): Observable<ScreenAccess> {
    return this.api.get<ScreenAccess>(API.screenAccess.base, {
      params: { route },
      context: silentContext(),
    });
  }

  /** Report elapsed seconds on the screen; returns the updated access. */
  heartbeat(route: string, seconds: number): Observable<ScreenAccess> {
    return this.api.post<ScreenAccess>(
      API.screenAccess.heartbeat,
      { route, seconds },
      { context: silentContext() },
    );
  }
}
