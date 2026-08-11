import { Routes } from '@angular/router';
import { OrderScreenConfig } from '../ftp-order-entry/ftp-order.model';

/**
 * Trial Transaction — the FTP Order Entry screen (same UI + conditions) but new
 * orders are stamped ActiveStatus = 'Trial', the list is filtered to Trial orders,
 * and the form shows an extra "Bank Rate" field (saved to the ClientRate column).
 * Reuses FtpOrderListComponent / FtpOrderEntryComponent via route `data`.
 */
const TRIAL_TRANSACTION_CONFIG: OrderScreenConfig = {
  mode: 'trial',
  title: 'Trial Transaction',
  basePath: '/trial-transaction',
  status: 'Trial',
  showBankRate: true,
};

export const TRIAL_TRANSACTION_ROUTES: Routes = [
  {
    path: '',
    title: 'Trial Transaction — RouteForex',
    data: { orderConfig: TRIAL_TRANSACTION_CONFIG },
    loadComponent: () =>
      import('../ftp-order-entry/ftp-order-list/ftp-order-list').then((m) => m.FtpOrderListComponent),
  },
  {
    path: 'new',
    title: 'New Trial Transaction — RouteForex',
    data: { orderConfig: TRIAL_TRANSACTION_CONFIG },
    loadComponent: () =>
      import('../ftp-order-entry/ftp-order-entry').then((m) => m.FtpOrderEntryComponent),
  },
  {
    path: ':id/edit',
    title: 'Edit Trial Transaction — RouteForex',
    data: { orderConfig: TRIAL_TRANSACTION_CONFIG },
    loadComponent: () =>
      import('../ftp-order-entry/ftp-order-entry').then((m) => m.FtpOrderEntryComponent),
  },
];
