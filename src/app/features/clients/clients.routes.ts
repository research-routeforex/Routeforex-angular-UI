import { Routes } from '@angular/router';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Client Master — RouteForex',
    loadComponent: () => import('./clients-list/clients-list').then((m) => m.ClientsListComponent),
  },
  {
    path: 'new',
    title: 'New Client — RouteForex',
    loadComponent: () => import('./client-form/client-form').then((m) => m.ClientFormComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Client — RouteForex',
    loadComponent: () => import('./client-form/client-form').then((m) => m.ClientFormComponent),
  },
];
