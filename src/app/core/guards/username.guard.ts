import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Username-based access guard. Reads the allowed usernames from the route's
 * `data.usernames` array and grants access only to those users — independent of
 * role (so even an Admin is blocked unless their username is listed).
 *
 * Usage:
 *   { path: 'clients', canActivate: [authGuard, userNameGuard],
 *     data: { usernames: ['9599733946'] } }
 */
export const userNameGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed = (route.data['usernames'] as string[] | undefined) ?? [];
  const me = auth.user()?.userName ?? '';
  if (!allowed.length || allowed.includes(me)) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};
