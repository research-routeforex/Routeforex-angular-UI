import { Routes } from '@angular/router';

export const ROLE_PERMISSIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'Role Permissions — RouteForex',
    loadComponent: () => import('./role-permissions').then((m) => m.RolePermissionsComponent),
  },
];
