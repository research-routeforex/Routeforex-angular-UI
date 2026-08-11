import { Routes } from '@angular/router';
import { OrderScreenConfig } from '../ftp-order-entry/ftp-order.model';

/**
 * Client Order — the FTP Order Entry screen (same UI + conditions) but new orders
 * are stamped ActiveStatus = 'Client' and the list is filtered to Client orders.
 * Reuses FtpOrderListComponent / FtpOrderEntryComponent via route `data`.
 */
const CLIENT_ORDER_CONFIG: OrderScreenConfig = {
  mode: 'client',
  title: 'Client Order',
  basePath: '/client-order',
  status: 'Client',
  showBankRate: false,
};

export const CLIENT_ORDER_ROUTES: Routes = [
  {
    path: '',
    title: 'Client Order — RouteForex',
    data: { orderConfig: CLIENT_ORDER_CONFIG },
    loadComponent: () =>
      import('../ftp-order-entry/ftp-order-list/ftp-order-list').then((m) => m.FtpOrderListComponent),
  },
  {
    path: 'new',
    title: 'New Client Order — RouteForex',
    data: { orderConfig: CLIENT_ORDER_CONFIG },
    loadComponent: () =>
      import('../ftp-order-entry/ftp-order-entry').then((m) => m.FtpOrderEntryComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Client Order — RouteForex',
    data: { orderConfig: CLIENT_ORDER_CONFIG },
    loadComponent: () =>
      import('../ftp-order-entry/ftp-order-entry').then((m) => m.FtpOrderEntryComponent),
  },
];
