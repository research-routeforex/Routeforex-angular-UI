import { Routes } from '@angular/router';

export const COMMON_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Common Master — RouteForex',
    loadComponent: () => import('./common-master').then((m) => m.CommonMasterComponent),
  },
];
