import { Routes } from '@angular/router';

export const FTP_ORDER_ENTRY_ROUTES: Routes = [
  {
    path: '',
    title: 'FTP Order Entry — RouteForex',
    loadComponent: () => import('./ftp-order-list/ftp-order-list').then((m) => m.FtpOrderListComponent),
  },
  {
    path: 'new',
    title: 'New Deal — RouteForex',
    loadComponent: () => import('./ftp-order-entry').then((m) => m.FtpOrderEntryComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Deal — RouteForex',
    loadComponent: () => import('./ftp-order-entry').then((m) => m.FtpOrderEntryComponent),
  },
];

