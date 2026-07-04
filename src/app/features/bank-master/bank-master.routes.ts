import { Routes } from '@angular/router';

export const BANK_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Bank Master — RouteForex',
    loadComponent: () => import('./bank-master').then((m) => m.BankMasterComponent),
  },
  {
    path: 'new',
    title: 'New Bank — RouteForex',
    loadComponent: () => import('./bank-form/bank-form').then((m) => m.BankFormComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Bank — RouteForex',
    loadComponent: () => import('./bank-form/bank-form').then((m) => m.BankFormComponent),
  },
  {
    path: 'head-office/new',
    title: 'New Head Office — RouteForex',
    loadComponent: () =>
      import('./head-office-form/head-office-form').then((m) => m.HeadOfficeFormComponent),
  },
  {
    path: 'head-office/:id/edit',
    title: 'Edit Head Office — RouteForex',
    loadComponent: () =>
      import('./head-office-form/head-office-form').then((m) => m.HeadOfficeFormComponent),
  },
];
