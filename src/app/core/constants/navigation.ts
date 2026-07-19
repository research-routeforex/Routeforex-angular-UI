import { NavSection } from '../models/nav-item.model';
import { AppRole } from '../enums/role.enum';

/**
 * Master navigation definition. The sidebar renders this, filtering each item by
 * the current user's roles. Items without `roles` are visible to any
 * authenticated user. Endpoints not yet implemented on the backend are marked
 * "Soon" and route to a placeholder page.
 */
export const NAVIGATION: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
      {
        label: 'Dealer Pad',
        icon: 'candlestick_chart',
        route: '/dealer-pad',
        
      },
      { label: 'Management Dashboard', icon: 'monitoring', route: '/management-dashboard' },
      { label: 'Executive Dashboard', icon: 'insights', route: '/executive-dashboard', badge: 'New' },
      {
        label: 'Executive Expiry Transaction',
        icon: 'event_busy',
        route: '/executive-expiry',
        badge: 'New',
      },
      { label: 'Ticker Live Rate', icon: 'show_chart', route: '/ticker' },
    ],
  },
  {
    title: 'Masters',
    items: [
      {
        label: 'Client Master',
        icon: 'badge',
        route: '/clients',
        badge: 'Soon',
        usernames: ['9599733946'],
      },
      { label: 'Common Master', icon: 'public', route: '/common-master' },
      { label: 'Currency Master', icon: 'payments', route: '/currency-master', badge: 'New' },
      { label: 'Bank Master', icon: 'account_balance', route: '/bank-master', badge: 'New' },
      { label: 'Company Master', icon: 'domain', route: '/company-master', badge: 'New' },
      { label: 'Cities', icon: 'location_city', route: '/cities' },
      { label: 'Tenors', icon: 'schedule', route: '/tenors' },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { label: 'FTP Order Entry', icon: 'request_quote', route: '/ftp-order-entry' },
      { label: 'Generate Invoice', icon: 'receipt_long', route: '/generate-invoice' },
      {
        label: 'Purchase',
        icon: 'shopping_cart',
        route: '/purchase',
        badge: 'Soon',
        roles: [AppRole.Admin, AppRole.Dealer],
      },
      {
        label: 'Sales',
        icon: 'point_of_sale',
        route: '/sales',
        badge: 'Soon',
        roles: [AppRole.Admin, AppRole.RelationshipManager, AppRole.SalesUser],
      },
      { label: 'Inventory', icon: 'warehouse', route: '/inventory', badge: 'Soon' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', icon: 'manage_accounts', route: '/users', roles: [AppRole.Admin] },
      { label: 'Roles', icon: 'admin_panel_settings', route: '/roles', roles: [AppRole.Admin] },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        label: 'Client Wise Revenue',
        icon: 'assessment',
        route: '/reports/client-wise-revenue',
        badge: 'New',
      },
      {
        label: 'Report UC',
        icon: 'table_view',
        route: '/reports/report-uc',
        badge: 'New',
      },
      {
        label: 'PNL MIS',
        icon: 'account_balance',
        route: '/reports/pnl-mis',
        badge: 'New',
      },
    ],
  },
];
