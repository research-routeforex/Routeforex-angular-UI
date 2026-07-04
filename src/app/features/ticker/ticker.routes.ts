import { Routes } from '@angular/router';

export const TICKER_ROUTES: Routes = [
  {
    path: '',
    title: 'Ticker Live Rate — RouteForex',
    loadComponent: () => import('./ticker').then((m) => m.TickerComponent),
  },
];
