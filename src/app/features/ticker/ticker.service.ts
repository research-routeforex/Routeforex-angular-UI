import { Injectable, signal } from '@angular/core';
import {
  buildForexBoard,
  buildFutures,
  CurrencyFutureQuote,
  ForexBoardRow,
} from './ticker.models';

/**
 * Backs the Ticker Live Rate screen. Serves dummy currency-future and spot-FX
 * quotes and jitters them on each {@link tick}. Replace the builders + tick with
 * a real market-data feed later — the component reads only the signals here.
 */
@Injectable({ providedIn: 'root' })
export class TickerService {
  private readonly _futures = signal<CurrencyFutureQuote[]>(buildFutures());
  readonly futures = this._futures.asReadonly();

  private readonly _board = signal<ForexBoardRow[]>(buildForexBoard());
  readonly board = this._board.asReadonly();

  private readonly _lastUpdated = signal<Date>(new Date());
  readonly lastUpdated = this._lastUpdated.asReadonly();

  private static sign(next: number, prev: number): number {
    if (next > prev) return 1;
    if (next < prev) return -1;
    return 0;
  }

  /** Advance every quote by a small random move. Call on a ~1s interval. */
  tick(): void {
    this._futures.update((rows) =>
      rows.map((q) => {
        const d = q.close < 1 ? 4 : 4;
        const drift = (Math.random() - 0.5) * q.close * 0.0008;
        const ltp = +(q.ltp + drift).toFixed(d);
        const spread = +(q.close * 0.0002).toFixed(d);
        const bid = +(ltp - spread).toFixed(d);
        const ask = +(ltp + spread).toFixed(d);
        return {
          ...q,
          ltpDir: TickerService.sign(ltp, q.ltp),
          bidDir: TickerService.sign(bid, q.bid),
          askDir: TickerService.sign(ask, q.ask),
          ltp,
          bid,
          ask,
          bidQty: 1 + Math.floor(Math.random() * 40),
          askQty: 1 + Math.floor(Math.random() * 40),
          high: Math.max(q.high, ltp),
          low: Math.min(q.low, ltp),
          volume: q.volume + Math.floor(Math.random() * 600),
        };
      }),
    );

    this._board.update((rows) =>
      rows.map((q) => {
        const drift = (Math.random() - 0.5) * q.close * 0.0008;
        const ltp = +(q.ltp + drift).toFixed(4);
        const spread = +(q.close * 0.0002).toFixed(4);
        const bid = +(ltp - spread).toFixed(4);
        const ask = +(ltp + spread).toFixed(4);
        return {
          ...q,
          ltpDir: TickerService.sign(ltp, q.ltp),
          bidDir: TickerService.sign(bid, q.bid),
          askDir: TickerService.sign(ask, q.ask),
          ltp,
          bid,
          ask,
          high: Math.max(q.high, ltp),
          low: Math.min(q.low, ltp),
        };
      }),
    );

    this._lastUpdated.set(new Date());
  }
}
