import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Dashboard — RouteForex',
    loadComponent: () => import('./dashboard').then((m) => m.DashboardComponent),
  },
];
