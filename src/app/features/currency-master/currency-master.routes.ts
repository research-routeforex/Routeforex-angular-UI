import { Routes } from '@angular/router';

export const CURRENCY_MASTER_ROUTES: Routes = [
  {
    path: '',
    title: 'Currency Master — RouteForex',
    loadComponent: () => import('./currency-master').then((m) => m.CurrencyMasterComponent),
  },
];
