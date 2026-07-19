import { Routes } from '@angular/router';

export const COMPANY_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Company Master — RouteForex',
    loadComponent: () => import('./company-master').then((m) => m.CompanyMasterComponent),
  },
  {
    path: 'new',
    title: 'New Company — RouteForex',
    loadComponent: () => import('./company-form/company-form').then((m) => m.CompanyFormComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Company — RouteForex',
    loadComponent: () => import('./company-form/company-form').then((m) => m.CompanyFormComponent),
  },
  {
    path: 'comp-bank/new',
    title: 'New Company Bank — RouteForex',
    loadComponent: () =>
      import('./comp-bank-form/comp-bank-form').then((m) => m.CompBankFormComponent),
  },
  {
    path: 'comp-bank/:id/edit',
    title: 'Edit Company Bank — RouteForex',
    loadComponent: () =>
      import('./comp-bank-form/comp-bank-form').then((m) => m.CompBankFormComponent),
  },
];
