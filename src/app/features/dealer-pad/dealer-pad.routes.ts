import { Routes } from '@angular/router';

export const DEALER_PAD_ROUTES: Routes = [
  {
    path: '',
    title: 'Dealer Pad — RouteForex',
    loadComponent: () => import('./dealer-pad').then((m) => m.DealerPadComponent),
  },
];
