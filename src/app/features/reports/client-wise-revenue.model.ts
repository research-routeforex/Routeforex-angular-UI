/** Client-Wise Revenue report (pivot) returned by the API. */
export interface ClientWiseRevenueReport {
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  generatedDate: string | null;
  faYear: string;
  /** 12 month labels in financial-year order (April → March). */
  months: string[];
  /** 6 charge-category labels. */
  categories: string[];
  rows: ClientRevenueRow[];
  /** Column grand totals across all clients — one per category. */
  grandCategoryTotals: number[];
  grandTotal: number;
}

/** One client's row: 12 months × 6 categories, plus per-client totals. */
export interface ClientRevenueRow {
  slNo: number;
  clientId: number;
  clientName: string | null;
  zone: string | null;
  rm: string | null;
  /** months[m][c] — amount for month index m (0–11), category index c (0–5). */
  months: number[][];
  /** Sum across months for each of the 6 categories. */
  categoryTotals: number[];
  total: number;
}
