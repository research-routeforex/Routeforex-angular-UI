/** One row of the MIS / Deal-Coverage report (Reports/mis, proc @TYPE = 2). */
export interface MisReportRow {
  rowNumber: number;
  date: string | null;
  timeOut: string | null;
  clientName: string | null;
  contactPerson: string | null;
  bankName: string | null;
  branch: string | null;
  dealerName: string | null;
  transTypeName: string | null;
  maturityType: string | null;
  currency: string | null;
  transactionAmount: number;
  interBankRate: number;
  forwardPremiumCashSpot: number;
  bankCommissionPaisa: number;
  fixedAmountWithBank: number;
  amountInInr: number;
  maturityDate: string | null;
  transactionDetail: string | null;
  ourCommission: number;
  revenue: number;
  region: string | null;
  zone: string | null;
}

/** Filters for the MIS report (From / To required, client optional). */
export interface MisReportFilters {
  fromDate: string; // yyyy-MM-dd
  toDate: string; // yyyy-MM-dd
  clientId: number | null;
}
