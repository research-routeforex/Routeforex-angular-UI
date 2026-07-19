/**
 * Executive Dashboard — deal-level positions for one client, split into Import and
 * Export sections. Rows come from `usp_RF_ExecutiveDashboard_Search`
 * (@Action = 'SEARCH', @Type = Import/Export). Dates arrive pre-formatted (dd/MM/yyyy,
 * blank when unset); amounts/rates are numbers; MTM is text as the proc returns it.
 */

export type Section = 'Import' | 'Export';
export const SECTIONS: Section[] = ['Import', 'Export'];

/** One deal row as returned by the API (mirrors ExecutiveDashboardRowDto, camelCased). */
export interface ExecutiveDashboardRow {
  rowNumber?: string | null;
  recordID: number;
  bankName?: string | null;
  bankLcNo?: string | null;
  bankLcDate?: string | null;
  interstRate: number;
  annualiseInterestCost: number;
  buyersCreditTakenDate?: string | null;
  partyName?: string | null;
  dueDate?: string | null;
  currencyFrom?: string | null;
  currencyTo?: string | null;
  drawDownAmount: number;
  drawDownRate: number;
  invoiceAmount: number;
  interestBuyersCredit: number;
  bankSwiftCharges: number;
  totalAmountDue: number;
  forwardContractAmount: number;
  forwardContractRateBooked: number;
  forwardContractBookingDate?: string | null;
  forwardContractBookingNo?: string | null;
  rbiReferenceRate: number;
  inrAmountDay1: number;
  crystallzedInrAmount: number;
  effectiveHedgeCost: number;
  workingCapitalCost: number;
  subvention: number;
  remarks?: string | null;
  mtm?: string | null;
  type?: string | null;
  amountUsed: number;
  amountOutstanding: number;
}

/** Which UC action a row is being acted on with. */
export type UcMode = 'Utilization' | 'Cancellation';

/** Payload for recording a Utilization / Cancellation (mirrors ExecutiveUcSaveRequest). */
export interface ExecutiveUcRequest {
  executiveID: number;
  transactionType: UcMode;
  isPartialFull: 'Partial' | 'Full';
  importExport?: string | null;
  clientID: number;
  utilizationAmount: number;
  // Utilization
  edcCharge: number;
  finalRate: number;
  // Cancellation
  spot: number;
  premiumCashSpot: number;
  cancellationRate: number;
  profitLoss: number;
}

/** A new/edited Import / Export deal (mirrors ExecutiveDealSaveRequest). */
export interface ExecutiveDealRequest {
  /** Set to update an existing deal; omit to insert a new one. */
  recordID?: number | null;
  type: Section;
  clientID: number;
  bankName: number | null;
  bankLcNo: string | null;
  bankLcDate: string | null;
  bcRollover: string | null;
  bcUsanceLc: string | null;
  interstRate: number;
  buyersCreditTakenDate: string | null;
  partyName: string | null;
  dueDate: string | null;
  currencyFrom: string | null;
  currencyTo: string | null;
  invoiceAmount: number;
  interestBuyersCredit: number;
  bankSwiftCharges: number;
  totalAmountDue: number;
  forwardContractAmount: number;
  forwardContractRateBooked: number;
  forwardContractBookingDate: string | null;
  forwardContractBookingNo: string | null;
  rbiReferenceRate: number;
  drawDownAmount: number;
  drawDownRate: number;
  subvention: number;
  remarks: string | null;
  status: number;
}

/**
 * One deal's editable fields, loaded from `usp_RF_ExecutiveDashboard_GetById` to
 * pre-fill the View / Edit form (mirrors ExecutiveDealDetailDto). Rates are
 * whole-number percents; dates are ISO 'yyyy-MM-dd' strings (null when unset).
 */
export interface ExecutiveDealDetail {
  recordID: number;
  type: Section;
  clientID: number;
  bankName: number | null;
  bankLcNo: string | null;
  bankLcDate: string | null;
  bcRollover: string | null;
  bcUsanceLc: string | null;
  interstRate: number;
  buyersCreditTakenDate: string | null;
  partyName: string | null;
  dueDate: string | null;
  currencyFrom: string | null;
  currencyTo: string | null;
  invoiceAmount: number;
  interestBuyersCredit: number;
  bankSwiftCharges: number;
  totalAmountDue: number;
  forwardContractAmount: number;
  forwardContractRateBooked: number;
  forwardContractBookingDate: string | null;
  forwardContractBookingNo: string | null;
  rbiReferenceRate: number;
  drawDownAmount: number;
  drawDownRate: number;
  subvention: number;
  remarks: string | null;
  status: number;
}

/** Headline totals shown in the summary strip (foreign-currency amounts summed). */
export interface ExecutiveTotals {
  totalAmountDue: number;
  forwardContractAmount: number;
  amountOutstanding: number;
  deals: number;
}

/** Sums the amount columns for the summary strip. */
export function totalsOf(rows: readonly ExecutiveDashboardRow[]): ExecutiveTotals {
  let totalAmountDue = 0;
  let forwardContractAmount = 0;
  let amountOutstanding = 0;
  for (const r of rows) {
    totalAmountDue += r.totalAmountDue || 0;
    forwardContractAmount += r.forwardContractAmount || 0;
    amountOutstanding += r.amountOutstanding || 0;
  }
  return { totalAmountDue, forwardContractAmount, amountOutstanding, deals: rows.length };
}
