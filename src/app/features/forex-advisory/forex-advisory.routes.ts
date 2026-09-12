import { Routes } from '@angular/router';

export const FOREX_ADVISORY_ROUTES: Routes = [
  {
    path: '',
    title: 'Forex Advisory — RouteForex',
    loadComponent: () => import('./forex-advisory').then((m) => m.ForexAdvisoryComponent),
  },
];
