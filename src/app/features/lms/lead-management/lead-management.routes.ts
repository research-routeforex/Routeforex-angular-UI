import { Routes } from '@angular/router';

export const LMS_LEAD_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    title: 'Lead Management — RouteForex',
    loadComponent: () => import('./lead-management').then((m) => m.LeadManagementComponent),
  },
];
