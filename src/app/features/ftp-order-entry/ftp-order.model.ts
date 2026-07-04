/** A row on the FTP Order Entry list. */
export interface FtpOrderListItem {
  recordId: number;
  orderNumber?: string | null;
  clientName?: string | null;
  transactionType?: string | null;
  impExp?: string | null;
  currencyCode?: string | null;
  amount?: number | null;
  maturityDate?: string | null;
  activeStatus?: string | null;
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
  bookingRate?: number | null;
  forwardContactNo?: string | null;
  outstandingAmount?: number | null;
  activeStatus?: string | null;
}
