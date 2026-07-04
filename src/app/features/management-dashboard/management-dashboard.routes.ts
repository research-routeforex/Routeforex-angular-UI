import { Routes } from '@angular/router';

export const MANAGEMENT_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Management Dashboard — RouteForex',
    loadComponent: () =>
      import('./management-dashboard').then((m) => m.ManagementDashboardComponent),
  },
];
