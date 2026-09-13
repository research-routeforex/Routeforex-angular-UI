/** A Historical Rate row (TFTPO_Mast_HistoricalRate). */
export interface HistoricalRate {
  recordID: number;
  rateDate: string | null;
  currency: string;
  spotForward: string;
  forwardMaturity: string;
  high: number;
  low: number;
  average: number;
  createdBy: string | null;
  createdDateTime: string | null;
}

/** Result of an Excel upload (rows inserted + a status message). */
export interface HistoricalRateUploadResult {
  inserted: number;
  msg: string;
}
