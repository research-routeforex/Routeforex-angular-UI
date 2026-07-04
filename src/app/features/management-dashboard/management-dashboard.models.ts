/**
 * Management Dashboard — domain types and roll-up math.
 *
 * The screen shows mark-to-market of outstanding positions for one client, split
 * into Import and Export sections and drilled down Currency → Month. Data comes
 * from `Proc_RF_ManagementDashboard` (@ClientID, @Action='GetAllTransactionData',
 * @Type=Import/Export); each row is mapped to a {@link DashboardLeaf}.
 *
 * Amounts (exposure, forward, unhedged) are in the *foreign* currency; rates
 * (avg costing, forward rate) are INR per unit. Mark-to-market is in INR and is
 * computed by the proc — the client only sums it, never recomputes it.
 */

export type Section = 'Import' | 'Export';
export const SECTIONS: Section[] = ['Import', 'Export'];

/** Display symbol for the common currencies; unknown codes fall back to the code. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  SGD: 'S$',
  AED: 'د.إ',
};

/** Indian Rupee sign, used for all INR-valued figures (rates & mark-to-market). */
export const INR_SYMBOL = '₹';

/** Symbol for a currency code, or the code itself when there's no known symbol. */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? currency ?? '';
}

/** Raw row as returned by the API (mirrors ManagementDashboardRowDto). */
export interface DashboardRowApi {
  type: string;
  currencyFrom: string;
  month: string;
  monthNo: number;
  recordID: number;
  totalAmountDue: number;
  forwardContractAmount: number;
  rbiReferenceRate: number;
  forwardContractRateBooked: number;
  workingCapitalCost: number;
  mtm: number;
}

/** A single transaction record (the date-level leaf of the drill-down). */
export interface DashboardLeaf {
  /** "Import" or "Export" — used to filter rows to the selected tab. */
  section: Section;
  currency: string;
  /** Sortable month-year key, e.g. '2026-08'. */
  monthKey: string;
  /** Display month-year, e.g. 'Aug 2026'. */
  monthLabel: string;
  /** Sortable date key, e.g. '2026-08-31'. */
  dateKey: string;
  /** Display date, e.g. '31-Aug-2026'. */
  date: string;
  /** Exposure, in foreign-currency units. */
  outstandingExposure: number;
  /** Hedged portion via forward contracts, in foreign-currency units. */
  forwardContractAmount: number;
  /** Reference / avg-costing rate (INR per unit). */
  avgCosting: number;
  /** Booked rate of the forward contract (INR per unit). */
  rateOfForwardContract: number;
  /** Average working-capital cost (% p.a.). */
  avgWorkingCapitalCost: number;
  /** Mark-to-market in INR, straight from the proc. */
  markToMarket: number;
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Derives the month-year group + day from the proc's `Month` value (a date such
 * as "31-Aug-2026") and `MonthNo`. Falls back gracefully when the value isn't a
 * full date — month-year then uses MonthNo only.
 */
function deriveMonth(monthStr: string, monthNo: number) {
  const s = (monthStr ?? '').trim();
  const parts = s.split(/[-/ ]+/).filter(Boolean);

  const yearPart = parts.find((p) => /^\d{4}$/.test(p));
  const year = yearPart ? Number(yearPart) : 0;
  const dayPart = parts.find((p) => /^\d{1,2}$/.test(p));
  const day = dayPart ? Number(dayPart) : 0;

  // Prefer MonthNo; otherwise read a month abbreviation from the string.
  let mon = Number(monthNo) || 0;
  if (!mon) {
    const abbr = parts.find((p) => MONTH_ABBR.some((m) => m.toLowerCase() === p.toLowerCase()));
    if (abbr) mon = MONTH_ABBR.findIndex((m) => m.toLowerCase() === abbr.toLowerCase()) + 1;
  }

  const monLabel = mon ? MONTH_ABBR[mon - 1] : s;
  const monthKey = `${year || 9999}-${String(mon || 99).padStart(2, '0')}`;
  const monthLabel = year ? `${monLabel} ${year}` : monLabel || `Month ${mon}`;
  const dateKey = `${monthKey}-${String(day || 0).padStart(2, '0')}`;

  return { monthKey, monthLabel, dateKey, date: s || monthLabel };
}

/** Normalises the proc's Type value ("Import"/"Export", any case) to a Section. */
export function toSection(type: string): Section {
  return (type ?? '').trim().toLowerCase().startsWith('imp') ? 'Import' : 'Export';
}

/** Maps a raw API row to a leaf. */
export function toLeaf(row: DashboardRowApi): DashboardLeaf {
  const { monthKey, monthLabel, dateKey, date } = deriveMonth(row.month, row.monthNo);
  return {
    section: toSection(row.type),
    currency: (row.currencyFrom ?? '').trim().toUpperCase(),
    monthKey,
    monthLabel,
    dateKey,
    date,
    outstandingExposure: +row.totalAmountDue || 0,
    forwardContractAmount: +row.forwardContractAmount || 0,
    avgCosting: +row.rbiReferenceRate || 0,
    rateOfForwardContract: +row.forwardContractRateBooked || 0,
    avgWorkingCapitalCost: +row.workingCapitalCost || 0,
    markToMarket: +row.mtm || 0,
  };
}

/** Aggregated, display-ready metrics for any node in the tree. */
export interface Metrics {
  outstandingExposure: number;
  forwardContractAmount: number;
  amountUnhedged: number;
  avgCosting: number;
  rateOfForwardContract: number;
  markToMarket: number;
  /** 0..1 — forward cover / exposure. */
  hedgeRatio: number;
  avgWorkingCapitalCost: number;
}

/** One rendered table row (flattened tree). */
export interface DisplayRow {
  id: string;
  level: 0 | 1 | 2; // 0 = currency, 1 = month-year, 2 = date
  label: string;
  currency: string;
  /** Symbol for the row's foreign currency ($, €, £, …). */
  symbol: string;
  expandable: boolean;
  expanded: boolean;
  metrics: Metrics;
}

/**
 * Roll a set of leaves into display metrics. Amounts and MTM are summed; rates and
 * working-capital cost are exposure/forward-weighted; hedge ratio is forward/exposure.
 */
export function aggregate(leaves: readonly DashboardLeaf[]): Metrics {
  let exposure = 0;
  let forward = 0;
  let costWeighted = 0;
  let forwardWeighted = 0;
  let wccWeighted = 0;
  let mtm = 0;

  for (const l of leaves) {
    exposure += l.outstandingExposure;
    forward += l.forwardContractAmount;
    costWeighted += l.avgCosting * l.outstandingExposure;
    forwardWeighted += l.rateOfForwardContract * l.forwardContractAmount;
    wccWeighted += l.avgWorkingCapitalCost * l.outstandingExposure;
    mtm += l.markToMarket;
  }

  return {
    outstandingExposure: exposure,
    forwardContractAmount: forward,
    amountUnhedged: exposure - forward,
    avgCosting: exposure ? costWeighted / exposure : 0,
    rateOfForwardContract: forward ? forwardWeighted / forward : 0,
    markToMarket: mtm,
    hedgeRatio: exposure ? forward / exposure : 0,
    avgWorkingCapitalCost: exposure ? wccWeighted / exposure : 0,
  };
}
