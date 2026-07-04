/** A Currency row (TPO_Mast_Currency). */
export interface Currency {
  currencyID: number;
  currencyCode: string;
  currencyName: string;
  activeStatus: string | null;
  flag: string | null;
  createdBy: string | null;
  createdDatetime: string | null;
  lastModifiedby: string | null;
  lastModifiedDatetime: string | null;
}

/**
 * Add/update payload (CurrencyID = 0 → add). Only the name and status are
 * captured — the code mirrors the name and the flag is stamped 'TPO' server-side.
 */
export interface SaveCurrency {
  currencyID: number;
  currencyName: string;
  activeStatus: string;
}
