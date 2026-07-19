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
}

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
