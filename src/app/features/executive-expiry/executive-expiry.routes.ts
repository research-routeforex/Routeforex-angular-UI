import { Routes } from '@angular/router';

export const EXECUTIVE_EXPIRY_ROUTES: Routes = [
  {
    path: '',
    title: 'Executive Expiry Transaction — RouteForex',
    loadComponent: () => import('./executive-expiry').then((m) => m.ExecutiveExpiryComponent),
  },
];
