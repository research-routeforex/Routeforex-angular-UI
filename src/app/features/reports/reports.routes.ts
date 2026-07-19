import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  { path: '', redirectTo: 'client-wise-revenue', pathMatch: 'full' },
  {
    path: 'client-wise-revenue',
    title: 'Client Wise Revenue — RouteForex',
    loadComponent: () =>
      import('./client-wise-revenue/client-wise-revenue').then((m) => m.ClientWiseRevenueComponent),
  },
  {
    path: 'report-uc',
    title: 'Report UC — RouteForex',
    loadComponent: () => import('./report-uc/report-uc').then((m) => m.ReportUcComponent),
  },
  {
    path: 'pnl-mis',
    title: 'PNL MIS Report — RouteForex',
    loadComponent: () => import('./pnl-mis/pnl-mis').then((m) => m.PnlMisComponent),
  },
];
