import { Routes } from '@angular/router';

export const SERVICE_OFFERED_ROUTES: Routes = [
  {
    path: '',
    title: 'Service Offered — RouteForex',
    loadComponent: () => import('./service-offered').then((m) => m.ServiceOfferedComponent),
  },
];
