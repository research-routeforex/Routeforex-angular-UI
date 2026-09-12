import { Routes } from '@angular/router';

export const ORDER_TRACKING_ROUTES: Routes = [
  {
    path: '',
    title: 'Order Tracking — RouteForex',
    loadComponent: () => import('./order-tracking').then((m) => m.OrderTrackingComponent),
  },
];
