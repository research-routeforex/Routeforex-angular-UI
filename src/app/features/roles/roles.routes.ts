import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    title: 'Roles — RouteForex',
    loadComponent: () => import('./roles-list/roles-list').then((m) => m.RolesListComponent),
  },
];
