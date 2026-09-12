/** Forex Advisory domain models (TPO_ForexAdvisory_ForexAdvisory). */

/** A Forex Advisory row. */
export interface ForexAdvisory {
  recordID: number;
  currency: string | null;
  rangeFrom: number | null;
  rangeTo: number | null;
  fileName: string | null; // relative path of the chart image
  status: string | null;
  message: string | null; // "Note"
  trend: string | null; // UPTREND / DOWNTREND
  createdDateTime: string | null;
}

/** Add/update payload (recordID = 0 → add). fileBase64 optional (new image). */
export interface SaveForexAdvisory {
  recordID: number;
  currency: string;
  rangeFrom: number | null;
  rangeTo: number | null;
  message: string | null;
  trend: string | null;
  status: string | null;
  fileName: string | null; // original name of a newly chosen image
  fileBase64: string | null; // base64/data-URL of a newly chosen image
}
