/** A live two-way price for a currency pair across the standard value dates. */
export interface CurrencyRate {
  pair: string;
  spotBid: number;
  spotAsk: number;
  cashSpotBid: number;
  cashSpotAsk: number;
  tomSpotBid: number;
  tomSpotAsk: number;
  cashRateBid: number;
  cashRateAsk: number;
  /** Direction of the spot bid vs the previous value (colours the value): 1 up, -1 down, 0 same. */
  spotBidDir: -1 | 0 | 1;
  /** Direction of the spot ask vs the previous value. */
  spotAskDir: -1 | 0 | 1;
  /** Direction of the cash-rate bid vs the previous value (arrows): 1 up, -1 down, 0 unchanged. */
  cashRateBidDir: -1 | 0 | 1;
  /** Direction of the cash-rate ask vs the previous value. */
  cashRateAskDir: -1 | 0 | 1;
}

export type DealDirection = 'Import' | 'Export';
export type TransactionType = 'Spot' | 'Cash' | 'Tom' | 'Forward';
export type DealStatus = 'pending' | 'saved' | 'submitted';

/** A dealing-desk deal. Lives in the client signal store until a Deals API ships. */
export interface Deal {
  id: string;
  clientName: string;
  contactPerson: string;
  contactNo: string;
  email: string;
  rmName: string;
  bankMargin: number;
  direction: DealDirection;
  currencyPair: string;
  amount: number;
  maturityDate: string;
  bank: string;
  transactionType: string;
  dealerName: string;
  spot: number;
  premium: number;
  margin: number;
  netRate: number;
  remarks: string;
  status: DealStatus;
  updatedAt: string;
}

/** Shape returned by GET /api/v1/LiveRates (LiveRateDto). */
export interface LiveRateApi {
  currencyPair: string;
  spotBid: number;
  spotAsk: number;
  cashSpotBid: number;
  cashSpotAsk: number;
  tomSpotBid: number;
  tomSpotAsk: number;
  cashRateBid: number;
  cashRateAsk: number;
}

/** Shape returned by GET /api/v1/DealerPadOrders (USP_RF_GETDEALERPADORDER). */
export interface DealerPadOrderApi {
  recordId: number;
  clientName: string;
  amount: number;
  impExp: string;
  activeStatus: string;
  transactionDesc: string;
  createdDatetime: string;
}

/** A bank-dealer contact (table 3 of USP_RF_GETORDERCLIENTDETAILS). */
export interface OrderContactApi {
  contactName: string;
  contactNumber: string;
  landlineNo: string;
}

/** A key/value option (e.g. bank id + name) from the order-details proc. */
export interface KeyValueApi {
  key: unknown;
  value: string;
}

/** Response of GET /api/v1/DealerPadOrders/{recordId}/details. */
export interface OrderClientDetailsApi {
  client: Record<string, unknown> | null;
  deal: Record<string, unknown> | null;
  contacts: OrderContactApi[];
  extra: Record<string, unknown>[];
  banks: KeyValueApi[];
}

export const CURRENCY_PAIRS = ['USD / INR', 'EUR / INR', 'GBP / INR', 'JPY / INR', 'AUD / INR'];

export const BANKS = [
  'ICICI Bank (Haryana)',
  'HDFC Bank',
  'Axis Bank',
  'State Bank of India',
  'Kotak Mahindra Bank',
  'Yes Bank',
];
