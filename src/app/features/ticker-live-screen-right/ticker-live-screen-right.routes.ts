import { Routes } from '@angular/router';

export const TICKER_LIVE_SCREEN_RIGHT_ROUTES: Routes = [
  {
    path: '',
    title: 'Ticker Live Screen Right — RouteForex',
    loadComponent: () =>
      import('./ticker-live-screen-right').then((m) => m.TickerLiveScreenRightComponent),
  },
];
