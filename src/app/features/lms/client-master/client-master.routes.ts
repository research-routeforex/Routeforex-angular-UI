import { Routes } from '@angular/router';

export const LMS_CLIENT_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Client Master — RouteForex',
    loadComponent: () => import('./client-master').then((m) => m.LmsClientMasterComponent),
  },
];
