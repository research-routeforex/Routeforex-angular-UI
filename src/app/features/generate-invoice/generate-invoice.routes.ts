import { Routes } from '@angular/router';

export const GENERATE_INVOICE_ROUTES: Routes = [
  {
    path: '',
    title: 'Generate Invoice — RouteForex',
    loadComponent: () => import('./generate-invoice').then((m) => m.GenerateInvoiceComponent),
  },
];
