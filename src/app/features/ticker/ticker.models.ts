/**
 * Ticker Live Rate — domain types and (temporary) dummy/live feed.
 *
 * Four sections: Forex, Currency Future, NEWS, Online Support. The Currency
 * Future section shows a live exchange-style quote board. Everything is dummy
 * for now; swap {@link buildFutures}/{@link buildForex} and the tick helpers in
 * the service for the real feed later — the component reads only signals.
 */

export type TickerSection = 'Forex' | 'Currency Future' | 'NEWS' | 'Online Support';

export interface TickerTab {
  key: TickerSection;
  icon: string;
}

export const TICKER_TABS: TickerTab[] = [
  { key: 'Forex', icon: 'currency_exchange' },
  { key: 'Currency Future', icon: 'show_chart' },
  { key: 'NEWS', icon: 'newspaper' },
  { key: 'Online Support', icon: 'support_agent' },
];

/** One live currency-future contract quote. */
export interface CurrencyFutureQuote {
  symbol: string;
  expiry: string;
  bidQty: number;
  bid: number;
  ask: number;
  askQty: number;
  ltp: number;
  open: number;
  high: number;
  low: number;
  /** Previous day's close — net/percentage change are measured against this. */
  close: number;
  volume: number;
  /** Tick direction (-1 down, 0 flat, 1 up) for cell flash/colour. */
  ltpDir: number;
  bidDir: number;
  askDir: number;
}

/** A live row on the Forex board (quadrant 1 of the Forex tab). */
export interface ForexBoardRow {
  description: string;
  bid: number;
  ask: number;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bidDir: number;
  askDir: number;
  ltpDir: number;
}

/** A row in the Forward Premium grid (quadrant 2), per selected currency. */
export interface ForwardPremiumRow {
  description: string;
  bid: number;
  ask: number;
  /** Annualised forward premium %, null for SPOT/CASH/TOM where not applicable. */
  bidPct: number | null;
  askPct: number | null;
  monthEnd: string;
  fwdBid: number;
  fwdAsk: number;
}

/** A Forex News row (quadrant 3). */
export interface ForexNewsRow {
  date: string;
  time: string;
  subject: string;
  source: string;
}

/** Result of the Broken Rate Calculator (quadrant 4). */
export interface BrokenRateResult {
  days: number;
  spotBid: number;
  spotAsk: number;
  swapBid: number;
  swapAsk: number;
  fwdBid: number;
  fwdAsk: number;
}

/** A news headline for the NEWS tab. */
export interface NewsItem {
  time: string;
  source: string;
  headline: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export function netChange(q: CurrencyFutureQuote): number {
  return q.ltp - q.close;
}
export function pctChange(q: CurrencyFutureQuote): number {
  return q.close ? ((q.ltp - q.close) / q.close) * 100 : 0;
}

// ---------------------------------------------------------------------------
// Dummy seed data
// ---------------------------------------------------------------------------

interface FutureSeed {
  symbol: string;
  expiry: string;
  base: number;
}

/** Contracts available per symbol — three monthly expiries each. */
const FUTURE_EXPIRIES = ['24-Jun-2026', '29-Jul-2026', '26-Aug-2026'];

/** Symbol → near-month base price. Successive expiries add a small premium. */
const FUTURE_SYMBOLS: { symbol: string; base: number }[] = [
  { symbol: 'USDINR', base: 83.62 },
  { symbol: 'EURINR', base: 90.34 },
  { symbol: 'GBPINR', base: 105.9 },
  { symbol: 'JPYINR', base: 0.5621 },
  { symbol: 'EURUSD', base: 1.0825 },
  { symbol: 'GBPUSD', base: 1.271 },
];

const FUTURE_SEEDS: FutureSeed[] = FUTURE_SYMBOLS.flatMap((sym) =>
  FUTURE_EXPIRIES.map((expiry, i) => ({
    symbol: sym.symbol,
    expiry,
    // Each later expiry carries a slightly higher forward price.
    base: +(sym.base * (1 + i * 0.0022)).toFixed(4),
  })),
);

export function buildFutures(): CurrencyFutureQuote[] {
  return FUTURE_SEEDS.map((s) => {
    const d = 4;
    const close = +s.base.toFixed(d);
    const open = +(close * (1 + (Math.random() - 0.5) * 0.004)).toFixed(d);
    const ltp = +(open * (1 + (Math.random() - 0.5) * 0.004)).toFixed(d);
    const spread = +(close * 0.0002).toFixed(d);
    return {
      symbol: s.symbol,
      expiry: s.expiry,
      bidQty: 1 + Math.floor(Math.random() * 40),
      bid: +(ltp - spread).toFixed(d),
      ask: +(ltp + spread).toFixed(d),
      askQty: 1 + Math.floor(Math.random() * 40),
      ltp,
      open,
      high: Math.max(open, ltp),
      low: Math.min(open, ltp),
      close,
      volume: 5000 + Math.floor(Math.random() * 200000),
      ltpDir: 0,
      bidDir: 0,
      askDir: 0,
    };
  });
}

// ---- Forex board (quadrant 1) ---------------------------------------------
const FOREX_BOARD_SEEDS: { description: string; base: number }[] = [
  { description: 'EURINRCOMP', base: 110.4975 },
  { description: 'GBPINRCOMP', base: 128.0725 },
  { description: 'JPYINRCOMP', base: 59.6325 },
  { description: 'SGDINRCOMP', base: 74.32 },
  { description: 'CHFINRCOMP', base: 119.75 },
  { description: 'EURUSD', base: 1.1544 },
  { description: 'GBPUSD', base: 1.338 },
  { description: 'USDJPY', base: 160.502 },
  { description: 'SGDUSD', base: 0.7762 },
  { description: 'CNYUSD', base: 0.1475 },
  { description: 'CNYINRCOMP', base: 14.125 },
  { description: 'AEDINRCOMP', base: 26.055 },
  { description: 'HKDINRCOMP', base: 12.215 },
  { description: 'CADINRCOMP', base: 68.5475 },
];

export function buildForexBoard(): ForexBoardRow[] {
  return FOREX_BOARD_SEEDS.map((s) => {
    const close = +s.base.toFixed(4);
    const open = +(close * (1 + (Math.random() - 0.5) * 0.004)).toFixed(4);
    const ltp = +(open * (1 + (Math.random() - 0.5) * 0.003)).toFixed(4);
    const spread = +(close * 0.0002).toFixed(4);
    return {
      description: s.description,
      bid: +(ltp - spread).toFixed(4),
      ask: +(ltp + spread).toFixed(4),
      ltp,
      open,
      high: Math.max(open, ltp),
      low: Math.min(open, ltp),
      close,
      bidDir: 0,
      askDir: 0,
      ltpDir: 0,
    };
  });
}

// ---- Forward Premium (quadrant 2) -----------------------------------------
/** Spot bid/ask per currency, driving the Forward Premium + Broken Rate panels. */
const FWD_SPOT: Record<string, { bid: number; ask: number }> = {
  USDINR: { bid: 89.87, ask: 89.88 },
  EURINR: { bid: 96.5, ask: 96.53 },
  GBPINR: { bid: 114.2, ask: 114.24 },
  JPYINR: { bid: 0.5612, ask: 0.5614 },
  CHFINR: { bid: 101.3, ask: 101.34 },
  SGDINR: { bid: 66.4, ask: 66.43 },
  AEDINR: { bid: 24.47, ask: 24.49 },
  CADINR: { bid: 65.3, ask: 65.33 },
};

export const FWD_CURRENCIES = Object.keys(FWD_SPOT);

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];
const FWD_YEAR = 2026;
const ANNUAL_BID = 0.027;
const ANNUAL_ASK = 0.03;

function ddmmyyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function buildForwardPremium(currency: string): ForwardPremiumRow[] {
  const spot = FWD_SPOT[currency] ?? FWD_SPOT['USDINR'];
  const today = ddmmyyyy(new Date());
  const rows: ForwardPremiumRow[] = [
    {
      description: 'SPOT',
      bid: spot.bid,
      ask: spot.ask,
      bidPct: null,
      askPct: null,
      monthEnd: today,
      fwdBid: spot.bid,
      fwdAsk: spot.ask,
    },
    {
      description: 'CASH/SPOT',
      bid: 2.0,
      ask: 8.0,
      bidPct: 4.0609,
      askPct: 16.2452,
      monthEnd: today,
      fwdBid: +(spot.bid + 0.0025).toFixed(4),
      fwdAsk: +(spot.ask + 0.0025).toFixed(4),
    },
    {
      description: 'TOM/SPOT',
      bid: 0,
      ask: 0,
      bidPct: null,
      askPct: null,
      monthEnd: today,
      fwdBid: spot.bid,
      fwdAsk: spot.ask,
    },
  ];

  for (let m = 0; m < 12; m++) {
    const days = (m + 1) * 30;
    const swapBid = +(spot.bid * ANNUAL_BID * (days / 365)).toFixed(4);
    const swapAsk = +(spot.ask * ANNUAL_ASK * (days / 365)).toFixed(4);
    const monthEnd = new Date(FWD_YEAR, m + 1, 0); // last day of month m
    rows.push({
      description: `${MONTH_NAMES[m]}-${FWD_YEAR}`,
      bid: swapBid,
      ask: swapAsk,
      bidPct: +((swapBid / spot.bid) * (365 / days) * 100).toFixed(4),
      askPct: +((swapAsk / spot.ask) * (365 / days) * 100).toFixed(4),
      monthEnd: ddmmyyyy(monthEnd),
      fwdBid: +(spot.bid + swapBid).toFixed(4),
      fwdAsk: +(spot.ask + swapAsk).toFixed(4),
    });
  }
  return rows;
}

// ---- Broken Rate Calculator (quadrant 4) ----------------------------------
/** Interpolate spot + swap to an arbitrary value date for the given currency. */
export function computeBrokenRate(currency: string, valueDateIso: string): BrokenRateResult {
  const spot = FWD_SPOT[currency] ?? FWD_SPOT['USDINR'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = valueDateIso ? new Date(valueDateIso) : today;
  const days = Math.max(0, Math.round((value.getTime() - today.getTime()) / 86_400_000));
  const swapBid = +(spot.bid * ANNUAL_BID * (days / 365)).toFixed(4);
  const swapAsk = +(spot.ask * ANNUAL_ASK * (days / 365)).toFixed(4);
  return {
    days,
    spotBid: spot.bid,
    spotAsk: spot.ask,
    swapBid,
    swapAsk,
    fwdBid: +(spot.bid + swapBid).toFixed(4),
    fwdAsk: +(spot.ask + swapAsk).toFixed(4),
  };
}

// ---- Forex News (quadrant 3) ----------------------------------------------
export const FOREX_NEWS: ForexNewsRow[] = [
  { date: '08-Jun-2026', time: '4:26am', subject: 'Market Opening Bell', source: 'News & Update' },
  { date: '04-Jun-2026', time: '3:54am', subject: 'Market Opening Bell', source: 'News & Update' },
  { date: '03-Jun-2026', time: '3:42am', subject: 'Market Opening Bell', source: 'News & Update' },
  { date: '02-Jun-2026', time: '3:38am', subject: 'RBI Reference Rate Update', source: 'News & Update' },
  { date: '01-Jun-2026', time: '3:30am', subject: 'Monthly FX Outlook', source: 'Research Desk' },
];

export const NEWS_ITEMS: NewsItem[] = [
  {
    time: '10:42',
    source: 'Reuters',
    headline: 'Rupee opens steady against the dollar as RBI seen smoothing volatility',
    sentiment: 'Neutral',
  },
  {
    time: '10:31',
    source: 'Bloomberg',
    headline: 'Dollar index eases ahead of US inflation print; Asian FX firms',
    sentiment: 'Bullish',
  },
  {
    time: '10:18',
    source: 'ET Markets',
    headline: 'Forward premiums inch up as importers cover near-month payables',
    sentiment: 'Bullish',
  },
  {
    time: '09:57',
    source: 'Mint',
    headline: 'Crude oil rises 1.2%; widening trade gap pressures the rupee',
    sentiment: 'Bearish',
  },
  {
    time: '09:40',
    source: 'CNBC',
    headline: 'Euro climbs after ECB official signals patience on rate cuts',
    sentiment: 'Bullish',
  },
  {
    time: '09:22',
    source: 'Reuters',
    headline: 'Exporters book forwards as USDINR nears upper end of recent range',
    sentiment: 'Neutral',
  },
];
