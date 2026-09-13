import { Routes } from '@angular/router';

export const CLIENT_INFORMATION_ROUTES: Routes = [
  {
    path: '',
    title: 'Client Information — RouteForex',
    loadComponent: () => import('./client-information').then((m) => m.ClientInformationComponent),
  },
];
