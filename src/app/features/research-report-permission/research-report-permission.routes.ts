import { Routes } from '@angular/router';

export const RESEARCH_REPORT_PERMISSION_ROUTES: Routes = [
  {
    path: '',
    title: 'Research Report Permission — RouteForex',
    loadComponent: () =>
      import('./research-report-permission').then((m) => m.ResearchReportPermissionComponent),
  },
];
