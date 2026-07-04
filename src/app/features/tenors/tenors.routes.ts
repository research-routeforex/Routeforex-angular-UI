import { Routes } from '@angular/router';

export const TENORS_ROUTES: Routes = [
  {
    path: '',
    title: 'Tenors — RouteForex',
    loadComponent: () => import('./tenors-list/tenors-list').then((m) => m.TenorsListComponent),
  },
];
