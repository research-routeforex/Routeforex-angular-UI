import { Routes } from '@angular/router';

export const RBI_RATE_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'RBI Rate Master — RouteForex',
    loadComponent: () => import('./rbi-rate-master').then((m) => m.RbiRateMasterComponent),
  },
];
