import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Users — RouteForex',
    loadComponent: () => import('./users-list/users-list').then((m) => m.UsersListComponent),
  },
];
