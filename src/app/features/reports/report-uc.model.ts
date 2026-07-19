/** One row of the Executive Dashboard UC report. */
export interface ReportUcRow {
  rowNumber: number;
  executiveId: number | null;
  id: number | null;
  transactionType: string | null;
  bookingDate: string | null;
  bankName: string | null;
  currency: string | null;
  importExport: string | null;
  forwardContractAmount: number | null;
  forwardContractRateBooked: number | null;
  maturityDate: string | null;
  utilizedAmount: number | null;
  utilizedDate: string | null;
  edcCharge: number | null;
  finalRate: number | null;
  cancellationRate: number | null;
  spot: number | null;
  premiumCashSpot: number | null;
  washRate: number | null;
  spotClosingRate: number | null;
  originalValue: number | null;
  rate: number | null;
  profitLoss: number | null;
}

/** Filters for the Report UC search. */
export interface ReportUcFilters {
  clientId: number | null;
  transactionType: string | null;
  importExport: string | null;
}
