import { Routes } from '@angular/router';

export const EXECUTIVE_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Executive Dashboard — RouteForex',
    loadComponent: () =>
      import('./executive-dashboard').then((m) => m.ExecutiveDashboardComponent),
  },
  {
    path: 'new',
    title: 'Add New Deal — RouteForex',
    data: { mode: 'new' },
    loadComponent: () =>
      import('./executive-deal-form/executive-deal-form').then((m) => m.ExecutiveDealFormComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Deal — RouteForex',
    data: { mode: 'edit' },
    loadComponent: () =>
      import('./executive-deal-form/executive-deal-form').then((m) => m.ExecutiveDealFormComponent),
  },
  {
    path: ':id/view',
    title: 'View Deal — RouteForex',
    data: { mode: 'view' },
    loadComponent: () =>
      import('./executive-deal-form/executive-deal-form').then((m) => m.ExecutiveDealFormComponent),
  },
];
