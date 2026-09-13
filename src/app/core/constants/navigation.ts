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
      { label: 'Client Contract', icon: 'description', route: '/client-contract', badge: 'New' },
      { label: 'Lead Master', icon: 'contact_mail', route: '/lead-master', badge: 'New' },
      { label: 'Forex Advisory', icon: 'trending_up', route: '/forex-advisory', badge: 'New' },
      { label: 'Order Tracking', icon: 'local_shipping', route: '/order-tracking', badge: 'New' },
      { label: 'Promo Code', icon: 'sell', route: '/promo-code', badge: 'New' },
      { label: 'Other Services', icon: 'add_business', route: '/other-services', badge: 'New' },
      { label: 'Service Offered', icon: 'design_services', route: '/service-offered', badge: 'New' },
      { label: 'User Company Mapping', icon: 'group_add', route: '/user-company-mapping', badge: 'New' },
      { label: 'Common Master', icon: 'public', route: '/common-master' },
      { label: 'Currency Master', icon: 'payments', route: '/currency-master', badge: 'New' },
      { label: 'Bank Master', icon: 'account_balance', route: '/bank-master', badge: 'New' },
      { label: 'RBI Rate Master', icon: 'currency_rupee', route: '/rbi-rate-master', badge: 'New' },
      { label: 'Historical Rate Master', icon: 'history', route: '/historical-rate-master', badge: 'New' },
      { label: 'Broadcast Group Master', icon: 'campaign', route: '/broadcast-group-master', badge: 'New' },
      { label: 'Broadcast Message', icon: 'send', route: '/broadcast-message', badge: 'New' },
      { label: 'Template Creator', icon: 'article', route: '/template-creator', badge: 'New' },
      { label: 'Company Master', icon: 'domain', route: '/company-master', badge: 'New' },
      { label: 'Cities', icon: 'location_city', route: '/cities' },
      { label: 'Tenors', icon: 'schedule', route: '/tenors' },
    ],
  },
  {
    title: 'Money Exchange',
    items: [
      {
        label: 'Client Information',
        icon: 'contact_page',
        route: '/money-exchange/client-information',
        badge: 'New',
      },
      {
        label: 'Order Information',
        icon: 'receipt_long',
        route: '/money-exchange/order-information',
        badge: 'New',
      },
    ],
  },
  {
    title: 'LMS',
    items: [
      { label: 'Client Master', icon: 'badge', route: '/lms/client-master', badge: 'New' },
      { label: 'Lead Management', icon: 'leaderboard', route: '/lms/lead-management', badge: 'New' },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { label: 'FTP Order Entry', icon: 'request_quote', route: '/ftp-order-entry' },
      { label: 'FTP Upcoming Deal', icon: 'event_upcoming', route: '/ftp-upcoming-deal' },
      { label: 'Client Order', icon: 'assignment_ind', route: '/client-order' },
      { label: 'Trial Transaction', icon: 'science', route: '/trial-transaction' },
      { label: 'Deal Coverage', icon: 'folder_open', route: '/deal-coverage' },
      { label: 'Rate Alert', icon: 'notifications_active', route: '/rate-alert', badge: 'New' },
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
      { label: 'Role Permissions', icon: 'security', route: '/role-permissions', roles: [AppRole.Admin], badge: 'New' },
      {
        label: 'Ticker Live Screen Right',
        icon: 'paid',
        route: '/ticker-live-screen-right',
        roles: [AppRole.Admin],
        badge: 'New',
      },
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
      {
        label: 'MIS Report',
        icon: 'summarize',
        route: '/reports/mis-report',
        badge: 'New',
      },
    ],
  },
];
