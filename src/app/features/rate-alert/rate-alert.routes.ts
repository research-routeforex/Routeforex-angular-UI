import { Routes } from '@angular/router';

export const RATE_ALERT_ROUTES: Routes = [
  {
    path: '',
    title: 'Rate Alert — RouteForex',
    loadComponent: () => import('./rate-alert').then((m) => m.RateAlertComponent),
  },
];
