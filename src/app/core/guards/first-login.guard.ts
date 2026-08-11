import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * First-login guard. A user seeded with RF_Users.PasswordChanged = 0 must set a
 * personal password before using the app. While the session carries
 * `mustChangePassword`, every authenticated child route is redirected to the
 * forced change-password screen (which lives under /auth, outside this guard).
 *
 * The cached flag is trusted only when it is already false (fast path). When it
 * says "must change", we reconcile against the server first — otherwise a stale
 * `true` left in web storage (e.g. after the DB flag was flipped elsewhere, or a
 * password change on another device) would trap the user on the first-login
 * screen with no way to self-heal.
 *
 * Usage: on the authenticated shell's `canActivateChild`, before menuAccessGuard.
 */
export const firstLoginGuard: CanActivateChildFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Fast path: the cached flag is already cleared — no server round-trip needed.
  if (!auth.user()?.mustChangePassword) {
    return true;
  }

  // Cached flag says "must change": confirm with the server before trapping the
  // user. reconcileMustChangePassword refreshes the session, so a stale flag is
  // corrected here and this guard short-circuits on the next navigation.
  return auth.reconcileMustChangePassword().pipe(
    map((mustChange) => (mustChange ? router.createUrlTree(['/auth/first-login']) : true)),
  );
};
