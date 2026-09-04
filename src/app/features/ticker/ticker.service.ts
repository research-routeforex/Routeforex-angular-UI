import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiService } from '../../core/services/api.service';
import {
  CurrencyFutureQuote,
  ForexBoardRow,
  ForexNewsRow,
  ForwardPremiumRow,
  ForwardRate,
  TickerAccess,
} from './ticker.models';

/** Raw shapes returned by usp_RF_Mast_ForexLiveScreen (camelCased by the API). */
interface ForexLiveRateApi {
  description: string;
  bid: number;
  ask: number;
  netChange: number;
  percentageChange: number;
  high: number;
  low: number;
  open: number;
  ltp: number;
  close: number;
}
interface CurrencyFutureApi {
  id: number;
  symbol: string;
  expiry: string;
  bidQty: number;
  bid: number;
  ask: number;
  askQty: number;
  ltp: number;
  netChg: number;
  perChg: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
interface ForexPremiumApi {
  description: string;
  bidPrice: number;
  askPrice: number;
  bidPercentage: number;
  askPercentage: number;
  monthEndDate: string;
  fwdOutrightBid: number;
  fwdOutrightAsk: number;
  currency: string;
}
/** Generic key/value dropdown item (mirrors the API's DropdownItemDto). */
interface DropdownItem {
  key: string | number | null;
  value: string | null;
}
interface ForexNewsApi {
  recordId: number;
  mailSubject: string;
  sourceName: string;
  mailBody: string;
  /** Pre-formatted by the SP, e.g. "08-Jun-2026  4:26am". */
  requestedDate: string;
}

const sign = (next: number, prev: number): number => (next > prev ? 1 : next < prev ? -1 : 0);

/**
 * News bodies are a mixed feed: emailed news is real HTML, while broadcast
 * messages are plain text the user typed line-by-line. Rendered via [innerHTML],
 * plain-text newlines collapse onto a single line — so for non-HTML bodies we
 * escape the text and turn line breaks into <br> to keep the intended layout.
 * Real HTML is passed through untouched (its own tags drive the layout).
 */
function formatNewsBody(raw: string): string {
  const s = raw ?? '';
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(s);
  if (looksLikeHtml) return s;
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n?|\n/g, '<br>');
}

/**
 * Backs the Ticker Live Rate screen with live data from
 * `usp_RF_Mast_ForexLiveScreen` (@Action + @Description):
 *   - board   -> SEARCHLIVERATE       (spot-rate board)
 *   - futures -> SEARCHCURRENCYFUTURE  (currency-future board)
 *   - premium -> SEARCHFOREXPREMIUM    (per-currency forward premium)
 *
 * The component reads only the signals here. Each refresh diffs against the
 * previous snapshot to set per-cell tick direction (up/down) for the flash UI.
 * Requests are "silent" so transient poll errors don't spam notifications; the
 * last good data is kept on error.
 */
@Injectable({ providedIn: 'root' })
export class TickerService {
  private readonly api = inject(ApiService);

  private readonly _futures = signal<CurrencyFutureQuote[]>([]);
  readonly futures = this._futures.asReadonly();

  private readonly _board = signal<ForexBoardRow[]>([]);
  readonly board = this._board.asReadonly();

  private readonly _premium = signal<ForwardPremiumRow[]>([]);
  readonly premium = this._premium.asReadonly();

  /** Distinct currencies for the Forward Premium dropdown (from TPO_Mast_ForexPremium). */
  private readonly _premiumCurrencies = signal<string[]>([]);
  readonly premiumCurrencies = this._premiumCurrencies.asReadonly();

  private readonly _news = signal<ForexNewsRow[]>([]);
  readonly news = this._news.asReadonly();

  private readonly _lastUpdated = signal<Date | null>(null);
  readonly lastUpdated = this._lastUpdated.asReadonly();

  /**
   * Effective Ticker access for the signed-in user (mode + free-trial budget).
   * Drives the paywall: only Clients are metered — Admin / subscribers are
   * "Unrestricted" / "Subscribed".
   */
  getAccess(): Observable<TickerAccess> {
    return this.api.get<TickerAccess>(API.tickerLiveScreenRight.access);
  }

  /** Persist elapsed free-trial seconds; returns the server's updated access. */
  sendHeartbeat(seconds: number): Observable<TickerAccess> {
    return this.api.post<TickerAccess>(
      API.tickerLiveScreenRight.heartbeat,
      { seconds },
      { context: silentContext() },
    );
  }

  /** Refresh the spot board + currency futures. Call on a polling interval. */
  refresh(): void {
    this.api
      .get<ForexLiveRateApi[]>(API.forex.tickerForex, { context: silentContext() })
      .subscribe({ next: (rows) => this.applyBoard(rows ?? []) });

    this.api
      .get<CurrencyFutureApi[]>(API.forex.tickerCurrencyFuture, { context: silentContext() })
      .subscribe({ next: (rows) => this.applyFutures(rows ?? []) });
  }

  /**
   * Load the distinct currencies for the Forward Premium dropdown. Returns them
   * so the caller can pick a default; also stored in the `premiumCurrencies` signal.
   */
  loadPremiumCurrencies(): Observable<string[]> {
    return this.api
      .get<DropdownItem[]>(API.forex.tickerPremiumCurrencies, { context: silentContext() })
      .pipe(
        map((rows) =>
          (rows ?? [])
            .map((r) => String(r.value ?? r.key ?? '').trim())
            .filter((v) => v.length > 0),
        ),
        tap((list) => this._premiumCurrencies.set(list)),
      );
  }

  /** Load the forward-premium grid for a currency (e.g. "USDINR"). */
  loadPremium(currency: string): void {
    this.api
      .get<ForexPremiumApi[]>(API.forex.tickerPremium, {
        params: { description: currency },
        context: silentContext(),
      })
      .subscribe({
        next: (rows) =>
          this._premium.set(
            (rows ?? []).map((r) => ({
              description: r.description,
              bid: r.bidPrice,
              ask: r.askPrice,
              bidPct: r.bidPercentage ?? null,
              askPct: r.askPercentage ?? null,
              monthEnd: r.monthEndDate,
              fwdBid: r.fwdOutrightBid,
              fwdAsk: r.fwdOutrightAsk,
            })),
          ),
      });
  }

  /**
   * Forward rate for one Broken Rate Calculator row. currencyFrom/currencyTo are
   * the 3-letter halves of the selected premium currency (e.g. USDINR → USD, INR);
   * monthEndDate is yyyy-MM-dd. Returns the proc rows (usually one).
   */
  forwardRate(monthEndDate: string, currencyFrom: string, currencyTo: string): Observable<ForwardRate[]> {
    return this.api
      .get<ForwardRate[]>(API.forex.tickerForwardRate, {
        params: { monthEndDate, currencyFrom, currencyTo },
        context: silentContext(),
      })
      .pipe(map((rows) => rows ?? []));
  }

  /** Load the Forex News feed for the signed-in user (@Action='selectNEWS'). */
  loadNews(): void {
    this.api
      .get<ForexNewsApi[]>(API.forex.tickerNews, { context: silentContext() })
      .subscribe({
        next: (rows) =>
          this._news.set(
            (rows ?? []).map((r) => {
              // RequestedDate is "dd-Mon-yyyy  h:mmam" — split date from time.
              const parts = (r.requestedDate ?? '').trim().split(/\s+/);
              return {
                date: parts[0] ?? '',
                time: parts.slice(1).join(' '),
                subject: r.mailSubject,
                source: r.sourceName,
                body: formatNewsBody(r.mailBody ?? ''),
              };
            }),
          ),
      });
  }

  private applyBoard(rows: ForexLiveRateApi[]): void {
    const prev = new Map(this._board().map((r) => [r.description, r]));
    this._board.set(
      rows.map((r) => {
        const p = prev.get(r.description);
        return {
          description: r.description,
          bid: r.bid,
          ask: r.ask,
          ltp: r.ltp,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          bidDir: p ? sign(r.bid, p.bid) : 0,
          askDir: p ? sign(r.ask, p.ask) : 0,
          ltpDir: p ? sign(r.ltp, p.ltp) : 0,
        };
      }),
    );
    this._lastUpdated.set(new Date());
  }

  private applyFutures(rows: CurrencyFutureApi[]): void {
    const key = (s: string, e: string) => `${s}|${e}`;
    const prev = new Map(this._futures().map((r) => [key(r.symbol, r.expiry), r]));
    this._futures.set(
      rows.map((r) => {
        const p = prev.get(key(r.symbol, r.expiry));
        return {
          symbol: r.symbol,
          expiry: r.expiry,
          bidQty: r.bidQty,
          bid: r.bid,
          ask: r.ask,
          askQty: r.askQty,
          ltp: r.ltp,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
          bidDir: p ? sign(r.bid, p.bid) : 0,
          askDir: p ? sign(r.ask, p.ask) : 0,
          ltpDir: p ? sign(r.ltp, p.ltp) : 0,
        };
      }),
    );
    this._lastUpdated.set(new Date());
  }
}
