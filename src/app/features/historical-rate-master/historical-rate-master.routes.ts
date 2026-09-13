import { Routes } from '@angular/router';

export const HISTORICAL_RATE_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Historical Rate Master — RouteForex',
    loadComponent: () =>
      import('./historical-rate-master').then((m) => m.HistoricalRateMasterComponent),
  },
];
