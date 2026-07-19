/** PNL MIS report (As-on / MTD / YTD zone sections) returned by the API. */
export interface PnlZoneReport {
  companyName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  generatedDate: string | null;
  /** The requested To Date, echoed as dd-MM-yyyy. */
  toDate: string;
  /** Measure column labels: TF, FTP Desk, Money Change, Retainers, Brokerage, Advisory, Total. */
  columns: string[];
  asOn: PnlSection;
  mtd: PnlSection;
  ytd: PnlSection;
}

/** One report section: grouped rows (data + per-zone subtotals) plus a grand total. */
export interface PnlSection {
  title: string;
  rows: PnlReportRow[];
  grandTotal: PnlReportRow;
}

/** One rendered row: a client/center line, a zone subtotal, or the grand total. */
export interface PnlReportRow {
  kind: 'data' | 'subtotal' | 'grand';
  zone: string | null;
  centers: string | null;
  rm: string | null;
  tf: number;
  ftp: number;
  moneyChange: number;
  retainers: number;
  brokerage: number;
  advisory: number;
  total: number;
}
