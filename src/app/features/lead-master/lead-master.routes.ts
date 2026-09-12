import { Routes } from '@angular/router';

export const LEAD_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Lead Master — RouteForex',
    loadComponent: () => import('./lead-master').then((m) => m.LeadMasterComponent),
  },
];
