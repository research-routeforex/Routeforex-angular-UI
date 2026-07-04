import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { MenuModule, MenuScreen } from '../models/menu.model';
import { ApiService } from './api.service';

/** Loads + caches the current user's permitted navigation menu (modules + screens). */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly api = inject(ApiService);

  private readonly _menu = signal<MenuModule[]>([]);
  /** Reactive view of the loaded menu. */
  readonly menu = this._menu.asReadonly();

  /** Shared in-flight/cached request so the layout and route guard reuse one load. */
  private menu$?: Observable<MenuModule[]>;

  getMenu(): Observable<MenuModule[]> {
    if (!this.menu$) {
      this.menu$ = this.api.get<MenuModule[]>('Menu').pipe(
        tap((m) => this._menu.set(m ?? [])),
        shareReplay(1),
      );
    }
    return this.menu$;
  }

  /** Clears the cache (e.g. after logout) so the next user reloads their menu. */
  reset(): void {
    this.menu$ = undefined;
    this._menu.set([]);
  }

  /** Finds the screen whose route matches (or prefixes) the given URL. */
  findByUrl(url: string): MenuScreen | undefined {
    const path = url.split('?')[0].split('#')[0];
    for (const m of this._menu()) {
      for (const s of m.screens) {
        if (path === s.route || path.startsWith(s.route + '/')) return s;
      }
    }
    return undefined;
  }
}

/** Convenience used by the guard so the menu is loaded before access is checked. */
export const ensureMenu = (svc: MenuService): Observable<MenuModule[]> =>
  svc.menu().length ? of(svc.menu()) : svc.getMenu();
