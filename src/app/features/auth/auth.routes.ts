import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout';
import { guestGuard } from '../../core/guards/guest.guard';

/** Unauthenticated routes rendered inside the split-screen auth layout. */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        title: 'Sign in — RouteForex',
        canActivate: [guestGuard],
        loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        title: 'Forgot password — RouteForex',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
      },
      {
        // No guestGuard: a reset link from email must work even if a stale session exists.
        path: 'reset-password',
        title: 'Reset password — RouteForex',
        loadComponent: () =>
          import('./reset-password/reset-password').then((m) => m.ResetPasswordComponent),
      },
    ],
  },
];
