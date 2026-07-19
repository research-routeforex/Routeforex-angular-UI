import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { menuAccessGuard } from './core/guards/menu-access.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

/** Builds a route for a not-yet-implemented module backed by the placeholder page. */
const placeholder = (
  path: string,
  data: { title: string; description: string; icon: string; section: string },
) => ({
  path,
  data,
  loadComponent: () =>
    import('./shared/components/placeholder/placeholder').then((m) => m.PlaceholderComponent),
});

export const routes: Routes = [
  // ---- Public / guest -----------------------------------------------------
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // ---- Standalone printable invoice (opens in a new tab, no app shell) ----
  {
    path: 'invoice/print/:id',
    title: 'Invoice — RouteForex',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/generate-invoice/invoice-print/invoice-print').then(
        (m) => m.InvoicePrintComponent,
      ),
  },

  // ---- Authenticated app shell -------------------------------------------
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    // Backend-driven per-screen access: blocks any child whose menu screen has
    // CanAccess = false (the AccessDenied flag), redirecting to /forbidden.
    canActivateChild: [menuAccessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'dealer-pad',
        loadChildren: () =>
          import('./features/dealer-pad/dealer-pad.routes').then((m) => m.DEALER_PAD_ROUTES),
      },
      {
        path: 'management-dashboard',
        loadChildren: () =>
          import('./features/management-dashboard/management-dashboard.routes').then(
            (m) => m.MANAGEMENT_DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'executive-dashboard',
        loadChildren: () =>
          import('./features/executive-dashboard/executive-dashboard.routes').then(
            (m) => m.EXECUTIVE_DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'executive-expiry',
        loadChildren: () =>
          import('./features/executive-expiry/executive-expiry.routes').then(
            (m) => m.EXECUTIVE_EXPIRY_ROUTES,
          ),
      },
      {
        path: 'ticker',
        loadChildren: () => import('./features/ticker/ticker.routes').then((m) => m.TICKER_ROUTES),
      },

      // Masters
      {
        path: 'clients',
        loadChildren: () => import('./features/clients/clients.routes').then((m) => m.CLIENTS_ROUTES),
      },
      {
        path: 'common-master',
        loadChildren: () =>
          import('./features/common-master/common-master.routes').then((m) => m.COMMON_MASTER_ROUTES),
      },
      {
        path: 'currency-master',
        loadChildren: () =>
          import('./features/currency-master/currency-master.routes').then(
            (m) => m.CURRENCY_MASTER_ROUTES,
          ),
      },
      {
        path: 'bank-master',
        loadChildren: () =>
          import('./features/bank-master/bank-master.routes').then((m) => m.BANK_MASTER_ROUTES),
      },
      {
        path: 'company-master',
        loadChildren: () =>
          import('./features/company-master/company-master.routes').then(
            (m) => m.COMPANY_MASTER_ROUTES,
          ),
      },
      {
        path: 'cities',
        loadChildren: () => import('./features/cities/cities.routes').then((m) => m.CITIES_ROUTES),
      },
      {
        path: 'tenors',
        loadChildren: () => import('./features/tenors/tenors.routes').then((m) => m.TENORS_ROUTES),
      },

      // Transactions
      {
        path: 'ftp-order-entry',
        loadChildren: () =>
          import('./features/ftp-order-entry/ftp-order-entry.routes').then(
            (m) => m.FTP_ORDER_ENTRY_ROUTES,
          ),
      },
      {
        path: 'generate-invoice',
        loadChildren: () =>
          import('./features/generate-invoice/generate-invoice.routes').then(
            (m) => m.GENERATE_INVOICE_ROUTES,
          ),
      },
      placeholder('purchase', {
        title: 'Purchase',
        description: 'Purchase orders, entries and reports.',
        icon: 'shopping_cart',
        section: 'Transactions',
      }),
      placeholder('sales', {
        title: 'Sales',
        description: 'Sales orders, invoices and reports.',
        icon: 'point_of_sale',
        section: 'Transactions',
      }),
      placeholder('inventory', {
        title: 'Inventory',
        description: 'Stock ledger, movement and adjustments.',
        icon: 'warehouse',
        section: 'Transactions',
      }),

      // Administration
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'roles',
        loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },

  // ---- Status pages -------------------------------------------------------
  {
    path: 'forbidden',
    title: 'Access denied — RouteForex',
    data: { code: '403', title: 'Access denied', message: 'You do not have permission to view this page.', icon: 'lock' },
    loadComponent: () =>
      import('./shared/components/status-page/status-page').then((m) => m.StatusPageComponent),
  },
  {
    path: '**',
    title: 'Not found — RouteForex',
    data: { code: '404', title: 'Page not found', message: 'The page you are looking for does not exist or has moved.', icon: 'search_off' },
    loadComponent: () =>
      import('./shared/components/status-page/status-page').then((m) => m.StatusPageComponent),
  },
];
