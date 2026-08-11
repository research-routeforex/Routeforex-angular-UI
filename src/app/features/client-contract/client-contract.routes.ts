import { Routes } from '@angular/router';

export const CLIENT_CONTRACT_ROUTES: Routes = [
  {
    path: '',
    title: 'Client Contract — RouteForex',
    loadComponent: () => import('./client-contract').then((m) => m.ClientContractComponent),
  },
];
