import { Routes } from '@angular/router';

export const CITIES_ROUTES: Routes = [
  {
    path: '',
    title: 'Cities — RouteForex',
    loadComponent: () => import('./cities-list/cities-list').then((m) => m.CitiesListComponent),
  },
];
