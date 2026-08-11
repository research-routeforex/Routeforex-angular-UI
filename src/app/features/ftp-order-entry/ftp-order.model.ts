/** A row on the FTP Order Entry list. */
export interface FtpOrderListItem {
  recordId: number;
  orderNumber?: string | null;
  clientName?: string | null;
  bankName?: string | null;
  transactionType?: string | null;
  impExp?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  /** Dealer net rate (TFTPO_Txn_OrderBooking.NetRateD). */
  netRateD?: number | null;
  maturityDate?: string | null;
  /** Scheduled date for an Upcoming deal (drives the Upcoming Deal list). */
  upcomingDate?: string | null;
  activeStatus?: string | null;
  /** Count of live Voice recordings attached to the order. */
  voiceCount?: number | null;
  /** Count of live Screenshot documents attached to the order. */
  screenshotCount?: number | null;
  createdDateTime?: string | null;
}

/** A client's order in the Deal Coverage "Order" dropdown (usp_RF_FtpOrder_GetByClient). */
export interface ClientOrder {
  recordId: number;
  orderNumber?: string | null;
  transactionType?: string | null;
  impExp?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  maturityDate?: string | null;
  activeStatus?: string | null;
  createdDatetime?: string | null;
}

/** Per-column filters sent to the server. */
export interface FtpOrderListFilter {
  orderNumber?: string;
  client?: string;
  transactionType?: string;
  impExp?: string;
  currency?: string;
  amount?: string;
  maturity?: string;
  status?: string;
  createdDateTime?: string;
  /** Upcoming Deal Date filter (Upcoming Deal list). */
  upcomingDate?: string;
}

/** Full order for the edit form. */
export interface FtpOrderDetail {
  recordId: number;
  clientID?: number | null;
  clientBank?: number | null;
  transactionTypeID?: number | null;
  orderNumber?: string | null;
  impExp?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  buySell?: string | null;
  maturityDate?: string | null;
  dateSelectionType?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  bookingRate?: number | null;
  forwardContactNo?: string | null;
  outstandingAmount?: number | null;
  refOrderNumber?: string | null;
  // EEFC Conversion / Bill Discount / PCFC Disbursement extras.
  transactionDetail?: string | null;
  billDiscount?: string | null;
  activeStatus?: string | null;
  /** Set when the order is scheduled ahead (ActiveStatus = 'Upcoming'). */
  upcomingDate?: string | null;

  // Live rate (read-only) — shown when ActiveStatus = Done / InvoiceGenerated.
  baseCurrency?: number | null;
  homeCurrency?: number | null;
  spot?: number | null;
  premiumDiscount?: number | null;
  margin?: number | null;
  netRate?: number | null;

  // Dealer rate (editable) on a Done / InvoiceGenerated order.
  baseCurrencyD?: number | null;
  homeCurrencyD?: number | null;
  spotD?: number | null;
  premiumDiscountD?: number | null;
  marginD?: number | null;
  netRateD?: number | null;

  // Dealer meta on a Done / InvoiceGenerated order — name + remarks editable; times read-only.
  dealerName?: string | null;
  remarks?: string | null;
  dealerSpotTime?: string | null;
  dealerBaseCurrencyTime?: string | null;
  dealerHomeCurrencyTime?: string | null;

  /** Trial Transaction "Bank Rate" (TFTPO_Txn_OrderBooking.ClientRate). */
  clientRate?: number | null;
}

/** Which transaction screen the shared FTP Order Entry form/list is rendering. */
export type OrderScreenMode = 'ftp' | 'client' | 'trial';

/**
 * Route-`data` config that lets the FTP Order Entry form + list be reused as the
 * Client Order and Trial Transaction screens: same UI/conditions, different
 * ActiveStatus, list filter, titles/links and (Trial only) the Bank Rate field.
 */
export interface OrderScreenConfig {
  mode: OrderScreenMode;
  /** Screen title / breadcrumb label, e.g. 'Client Order'. */
  title: string;
  /** Base route, e.g. '/client-order' (drives the list Add/Edit links + Cancel). */
  basePath: string;
  /** ActiveStatus stamped on new orders + the list's status filter ('Client'/'Trial'); null = FTP. */
  status: string | null;
  /** Trial only: show the Bank Rate field (mapped to ClientRate). */
  showBankRate: boolean;
}

/** Default (FTP Order Entry) config used when a route supplies no `orderConfig` data. */
export const FTP_ORDER_CONFIG: OrderScreenConfig = {
  mode: 'ftp',
  title: 'FTP Order Entry',
  basePath: '/ftp-order-entry',
  status: null,
  showBankRate: false,
};

/**
 * A parent Forward deal offered in the Cancellation / Utilization picker.
 * `balance` is the remaining (un-consumed) value available to cancel/utilize.
 */
export interface ForwardDeal {
  clientID: number;
  orderNumber?: string | null;
  refOrderNumber?: string | null;
  impExp?: string | null;
  currencyCode?: string | null;
  orderValue?: number | null;
  balance?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  maturityDate?: string | null;
  bookingRate?: number | null;
  forwardContactNo?: string | null;
  dateSelectionType?: string | null;
}
