import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { ensureMenu, MenuService } from '../services/menu.service';

/**
 * Backend-driven access guard. Loads the user's menu (cached) and blocks
 * navigation when the matching screen has `canAccess = false` (the
 * AccessDenied flag on RF_UserScreen). Screens not present in the menu are
 * allowed (not permission-managed).
 *
 * Usage:
 *   { path: 'clients', canActivate: [authGuard, menuAccessGuard], ... }
 */
export const menuAccessGuard: CanActivateFn = (_route, state) => {
  const menu = inject(MenuService);
  const router = inject(Router);

  return ensureMenu(menu).pipe(
    map(() => {
      const screen = menu.findByUrl(state.url);
      if (screen && screen.canAccess === false) {
        return router.createUrlTree(['/forbidden']);
      }
      return true;
    }),
  );
};
