import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Settings — RouteForex',
    loadComponent: () => import('./settings').then((m) => m.SettingsComponent),
  },
];
