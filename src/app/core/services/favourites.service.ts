import { inject, Injectable, signal } from '@angular/core';
import { API } from '../constants/api-endpoints';
import { silentContext } from '../interceptors/http-context.tokens';
import { ApiService } from './api.service';

/** A favourited screen (route + label + icon) as returned by the API. */
export interface FavouriteScreen {
  route: string;
  label: string;
  icon: string;
}

/** Normalize a route to a single leading-slash form so compares are stable. */
function normRoute(route: string): string {
  return route.startsWith('/') ? route : `/${route}`;
}

/**
 * Per-user favourite screens, persisted server-side (RF_UserFavourite) so they
 * follow the user across browsers/devices. Loaded once per session via `load()`
 * (called from the app shell); toggles update optimistically then sync the API.
 */
@Injectable({ providedIn: 'root' })
export class FavouritesService {
  private readonly api = inject(ApiService);

  private readonly _favourites = signal<FavouriteScreen[]>([]);
  /** The current user's favourites, in star order. */
  readonly favourites = this._favourites.asReadonly();

  /** Load the signed-in user's favourites from the API (call on app shell init). */
  load(): void {
    this.api.get<FavouriteScreen[]>(API.favourites.base, { context: silentContext() }).subscribe({
      next: (list) => this._favourites.set(list ?? []),
      error: () => this._favourites.set([]),
    });
  }

  isFavourite(route: string | undefined): boolean {
    if (!route) return false;
    const r = normRoute(route);
    return this._favourites().some((f) => normRoute(f.route) === r);
  }

  /** Star / un-star a screen (optimistic; reloads from the API on failure). */
  toggle(screen: { route?: string | null; label: string; icon: string }): void {
    if (!screen.route) return;
    const route = normRoute(screen.route);
    const exists = this._favourites().some((f) => normRoute(f.route) === route);

    if (exists) {
      this._favourites.update((list) => list.filter((f) => normRoute(f.route) !== route));
      this.api
        .delete<void>(API.favourites.base, { params: { route }, context: silentContext() })
        .subscribe({ error: () => this.load() });
    } else {
      this._favourites.update((list) => [
        ...list,
        { route, label: screen.label, icon: screen.icon },
      ]);
      this.api
        .post<void>(API.favourites.base, { route }, { context: silentContext() })
        .subscribe({ error: () => this.load() });
    }
  }
}
