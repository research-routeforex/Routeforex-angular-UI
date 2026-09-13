/** Money Exchange — Order Information models (MoneyChanging__OrderInformation). */

/** An order row (with joined client Name). */
export interface MeOrder {
  recordID: number;
  clientID: number | null;
  clientName: string | null;
  contactNumber: string | null;
  bookingDate: string | null;
  orderType: string | null; // Buy / Sell
  currencyCard: string | null; // Currency Notes / Forex Card
  currency: string | null; // pair text, e.g. 'USD / INR'
  amount: number | null;
  query: string | null;
  remarks: string | null;
  status: string | null; // Done / Not Done / Active / Inactive
}

/** Add/update payload (recordID = 0 → add). Client resolved from contactNumber. */
export interface SaveMeOrder {
  recordID: number;
  contactNumber: string;
  bookingDate: string | null;
  orderType: string | null;
  currencyCard: string | null;
  currency: string | null;
  amount: number | null;
  query: string | null;
  remarks: string | null;
  status: string | null;
}
