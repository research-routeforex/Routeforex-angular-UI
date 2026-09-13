import { Routes } from '@angular/router';

export const PROMO_CODE_ROUTES: Routes = [
  {
    path: '',
    title: 'Promo Code — RouteForex',
    loadComponent: () => import('./promo-code').then((m) => m.PromoCodeComponent),
  },
];
