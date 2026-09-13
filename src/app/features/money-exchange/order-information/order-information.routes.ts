import { Routes } from '@angular/router';

export const ORDER_INFORMATION_ROUTES: Routes = [
  {
    path: '',
    title: 'Order Information — RouteForex',
    loadComponent: () => import('./order-information').then((m) => m.OrderInformationComponent),
  },
];
