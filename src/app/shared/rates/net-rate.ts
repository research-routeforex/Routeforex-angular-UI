/**
 * Dealer Rates net-rate formula — a faithful port of the legacy `CalNetRate()`.
 *
 * Single source of truth shared by the Dealer Pad and FTP Order Entry screens so
 * both compute an identical Net Rate from the dealer-entered Spot / Premium /
 * Margin. Branches on Import/Export, the transaction-type id, and (for forwards,
 * type 5) the window mode plus the maturity date's proximity to today.
 */

export type NetRateDirection = 'Import' | 'Export';

/** Inputs to the Dealer Rates net-rate formula (a port of the legacy CalNetRate). */
export interface NetRateInput {
  /** Dealer-entered spot (#txtdealerspot). */
  spot: number;
  /** Dealer-entered premium / discount (#txtdealerpremiumdiscount). */
  premium: number;
  /** Dealer-entered margin (#txtdealermargin). */
  margin: number;
  direction: NetRateDirection;
  /** Transaction-type id (TFTPO_Mast_TransType / ddlTranType): '1'..'9'. */
  transactionType?: string | null;
  /** Forward window mode (legacy ddlForwd) — only used for type 5. */
  windowMode?: string | null;
  /** Maturity date (type 5 + Fix). Accepts DD/MM/YYYY, DD-MMM-YYYY, DD-MM-YYYY or YYYY-MM-DD. */
  maturityDate?: string | null;
  /** For type 7 only — the transaction type's Cash/Forward description (legacy TransactionDetail). */
  transactionDetail?: string | null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Parse a maturity-date string into a Date, tolerating the common desk formats. */
function parseMaturityDate(value: string | null | undefined): Date | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  // Legacy format: DD/MM/YYYY.
  if (s.includes('/')) {
    const [dd, mm, yyyy] = s.split('/');
    const d = Number(dd), m = Number(mm), y = Number(yyyy);
    return d && m && y ? new Date(y, m - 1, d) : null;
  }
  // Hyphen formats: YYYY-MM-DD, DD-MMM-YYYY or DD-MM-YYYY.
  if (s.includes('-')) {
    const p = s.split('-');
    if (p.length !== 3) return null;
    if (p[0].length === 4) {
      const y = Number(p[0]), m = Number(p[1]), d = Number(p[2]);
      return y && m && d ? new Date(y, m - 1, d) : null;
    }
    const d = Number(p[0]);
    const y = Number(p[2]);
    let m = Number(p[1]);
    if (!m) m = MONTHS.indexOf(p[1].slice(0, 3).toLowerCase()) + 1;
    return d && m && y ? new Date(y, m - 1, d) : null;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Whole-day offset of the maturity date from today: 0 today, -1 yesterday, -2 day-before. */
function maturityOffsetDays(value: string | null | undefined): number | null {
  const d = parseMaturityDate(value);
  if (!d) return null;
  const now = new Date();
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86_400_000);
}

/**
 * Dealer Rates net rate — a faithful port of the legacy `CalNetRate()`.
 * Branches on Import/Export, the transaction-type id, and (for forwards, type 5)
 * the window mode plus the maturity date's proximity to today.
 */
export function computeNetRate(input: NetRateInput): number {
  const spot = Number(input.spot) || 0;
  const premium = Number(input.premium) || 0;
  const margin = Number(input.margin) || 0;
  const txn = String(input.transactionType ?? '').trim();
  const isImport = input.direction === 'Import';

  let net: number;

  if (txn === '8') {
    // Cash-spot value-date — margin is not applied (legacy zeroes it).
    net = premium + spot;
  } else if (txn === '7') {
    // Driven by the deal's transaction detail; identical for Import & Export.
    const detail = String(input.transactionDetail ?? '').toLowerCase();
    net = detail.includes('forward') ? spot + premium - margin : spot - premium - margin;
  } else if (txn === '3') {
    // Cash — no premium.
    net = isImport ? spot + margin : spot - margin;
  } else if (txn === '4') {
    // Forward.
    net = isImport ? spot + premium + margin : spot + premium - margin;
  } else if (txn === '5') {
    // Forward, with an optional Fix maturity-date settlement adjustment.
    if (String(input.windowMode ?? '') === 'Fix') {
      const rel = maturityOffsetDays(input.maturityDate);
      if (isImport) {
        if (rel === 0 || rel === -1) net = spot - premium - margin;
        else if (rel === -2) net = spot - margin;
        else net = spot + premium - margin;
      } else {
        if (rel === 0 || rel === -1) net = spot - premium + margin;
        else if (rel === -2) net = spot + margin;
        else net = spot + premium + margin;
      }
    } else {
      net = isImport ? spot + premium - margin : spot + premium + margin;
    }
  } else {
    // Types 1 / 2 / 6 / 9 (cash-spot family) and the default.
    net = isImport ? spot - premium + margin : spot - premium - margin;
  }

  return Math.round(net * 10000) / 10000;
}
