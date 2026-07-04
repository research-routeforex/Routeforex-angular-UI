import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Role-based authorization guard. Reads the allowed roles from the route's
 * `data.roles` array and grants access when the user holds any of them.
 *
 * Usage:
 *   { path: 'users', canActivate: [authGuard, roleGuard], data: { roles: ['Admin'] } }
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = (route.data['roles'] as string[] | undefined) ?? [];
  if (auth.hasAnyRole(roles)) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};
