/** A Ticker Live Screen subscription row (TPO_Mast_TickerLiveScreenUserMaster). */
export interface TickerLiveScreenRow {
  id: number;
  clientID: number;
  clientName: string | null;
  amount: number | null;
  validityFrom: string | null;
  validityTo: string | null;
  createdBy: string | null;
  createdDateTime: string | null;
  updatedBy: string | null;
  updatedDateTime: string | null;
}

/** Add/update payload (id = 0 → add). */
export interface SaveTickerLiveScreen {
  id: number;
  clientID: number;
  amount: number | null;
  validityFrom: string;
  validityTo: string;
}
