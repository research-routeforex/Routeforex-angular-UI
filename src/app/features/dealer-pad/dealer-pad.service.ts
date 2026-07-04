import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { API } from '../../core/constants/api-endpoints';
import { silentContext } from '../../core/interceptors/http-context.tokens';
import { ApiResponse } from '../../core/models/api-response.model';
import { ApiService } from '../../core/services/api.service';
import {
  CurrencyRate,
  Deal,
  DealerPadOrderApi,
  DealStatus,
  LiveRateApi,
  OrderClientDetailsApi,
} from './dealer-pad.models';

const SEED_RATES: CurrencyRate[] = [
  rate('USD / INR', 95.7075, 95.7175, 0.008, 0.013, 0.004, 0.0065, 95.6945, 95.7095),
  rate('EUR / INR', 110.2175, 110.24, 0.0092, 0.015, 0.0046, 0.0075, 110.2025, 110.2308),
  rate('GBP / INR', 127.5575, 127.5775, 0.0107, 0.0174, 0.0053, 0.0087, 127.5401, 127.5668),
  rate('JPY / INR', 59.815, 59.825, 0.008, 0.013, 0.004, 0.0065, 59.802, 59.817),
  rate('AUD / INR', 67.5025, 67.515, 0.008, 0.013, 0.004, 0.0065, 67.4895, 67.507),
];

function rate(
  pair: string,
  spotBid: number,
  spotAsk: number,
  cashSpotBid: number,
  cashSpotAsk: number,
  tomSpotBid: number,
  tomSpotAsk: number,
  cashRateBid: number,
  cashRateAsk: number,
): CurrencyRate {
  return {
    pair,
    spotBid,
    spotAsk,
    cashSpotBid,
    cashSpotAsk,
    tomSpotBid,
    tomSpotAsk,
    cashRateBid,
    cashRateAsk,
    spotBidDir: 0,
    spotAskDir: 0,
    cashRateBidDir: 0,
    cashRateAskDir: 0,
  };
}

let seq = 1000;
const id = () => `DL-${++seq}`;

function deal(partial: Partial<Deal>): Deal {
  return {
    id: partial.id ?? id(),
    clientName: partial.clientName ?? '',
    contactPerson: partial.contactPerson ?? '',
    contactNo: partial.contactNo ?? '',
    email: partial.email ?? '',
    rmName: partial.rmName ?? '',
    bankMargin: partial.bankMargin ?? 0.05,
    direction: partial.direction ?? 'Export',
    currencyPair: partial.currencyPair ?? 'USD / INR',
    amount: partial.amount ?? 0,
    maturityDate: partial.maturityDate ?? '',
    bank: partial.bank ?? 'ICICI Bank (Haryana)',
    transactionType: partial.transactionType ?? 'Spot',
    dealerName: partial.dealerName ?? '',
    spot: partial.spot ?? 0,
    premium: partial.premium ?? 0,
    margin: partial.margin ?? 0.05,
    netRate: partial.netRate ?? 0,
    remarks: partial.remarks ?? '',
    status: partial.status ?? 'pending',
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
}

/** Net rate model: spot adjusted for forward premium and the dealer margin. */
export function computeNetRate(
  spot: number,
  premium: number,
  margin: number,
  direction: Deal['direction'],
): number {
  const adjusted = spot + (premium || 0);
  const net = direction === 'Export' ? adjusted - (margin || 0) : adjusted + (margin || 0);
  return Math.round(net * 10000) / 10000;
}

/**
 * Dealer-pad signal store: live rate board plus the pending and saved deal
 * queues. Self-contained (seeded, in-memory) until a Deals REST API is added —
 * swap the private mutations for service calls and the UI stays the same.
 */
@Injectable({ providedIn: 'root' })
export class DealerPadService {
  private readonly api = inject(ApiService);

  private readonly _rates = signal<CurrencyRate[]>(SEED_RATES);
  readonly rates = this._rates.asReadonly();

  /** Timestamp of the last time the rate board was refreshed (fetch or tick). */
  private readonly _lastUpdated = signal<Date | null>(null);
  readonly lastUpdated = this._lastUpdated.asReadonly();

  private readonly _pending = signal<Deal[]>([
    deal({ clientName: 'Mauria Udyog Limited', amount: 210609.92, currencyPair: 'USD / INR', direction: 'Export', status: 'pending', spot: 95.7075, premium: 0.013, margin: 0.05 }),
    deal({ clientName: 'Marda Commercial & Holdings', amount: 250000, currencyPair: 'EUR / INR', direction: 'Import', status: 'pending', spot: 110.2175, premium: 0.015, margin: 0.04 }),
  ]);
  readonly pending = this._pending.asReadonly();
  readonly pendingCount = computed(() => this._pending().length);

  private readonly _saved = signal<Deal[]>([
    deal({ clientName: 'Mauria Udyog Limited', amount: 210609.92, currencyPair: 'USD / INR', status: 'saved' }),
    deal({ clientName: 'Marda Commercial & Holdings', amount: 250000, currencyPair: 'EUR / INR', status: 'saved' }),
    deal({ clientName: 'Fusion Power Systems', amount: 1, currencyPair: 'GBP / INR', status: 'saved' }),
    deal({ clientName: 'RF Demo', amount: 564654, currencyPair: 'USD / INR', status: 'saved' }),
    deal({ clientName: 'RF Demo', amount: 5000, currencyPair: 'USD / INR', status: 'saved' }),
    deal({ clientName: 'NSI (India) Limited', amount: 50000, currencyPair: 'AUD / INR', status: 'saved' }),
    deal({ clientName: 'RouteForex', amount: 50000, currencyPair: 'JPY / INR', status: 'saved' }),
  ]);
  readonly saved = this._saved.asReadonly();
  readonly savedCount = computed(() => this._saved().length);

  /** Snapshot spot for a pair + transaction type (bid side). */
  spotFor(pair: string, txn: string): number {
    const r = this._rates().find((x) => x.pair === pair);
    if (!r) return 0;
    switch (txn) {
      case 'Cash':
        return r.cashRateBid;
      case 'Tom':
        return round(r.spotBid - r.tomSpotBid);
      default:
        return r.spotBid;
    }
  }

  /**
   * Fetch the current rates from the API (Proc_TFTPO_Mast_LiveRate). Runs silently
   * (no loader/toast) so a missing backend simply falls back to the simulated feed.
   * Returns the mapped rates; updates the board when the response is non-empty.
   */
  fetchLiveRates(): Observable<CurrencyRate[]> {
    return this.api.get<LiveRateApi[]>(API.forex.liveRates, { context: silentContext() }).pipe(
      map((rows) => (rows ?? []).map((r) => this.toRate(r))),
      tap((rates) => {
        if (rates.length) {
          this._rates.set(rates);
          this._lastUpdated.set(new Date());
        }
      }),
    );
  }

  private toRate(r: LiveRateApi): CurrencyRate {
    const prev = this._rates().find((x) => x.pair === r.currencyPair);
    return {
      pair: r.currencyPair,
      spotBid: r.spotBid,
      spotAsk: r.spotAsk,
      cashSpotBid: r.cashSpotBid,
      cashSpotAsk: r.cashSpotAsk,
      tomSpotBid: r.tomSpotBid,
      tomSpotAsk: r.tomSpotAsk,
      cashRateBid: r.cashRateBid,
      cashRateAsk: r.cashRateAsk,
      spotBidDir: direction(r.spotBid, prev?.spotBid),
      spotAskDir: direction(r.spotAsk, prev?.spotAsk),
      cashRateBidDir: direction(r.cashRateBid, prev?.cashRateBid),
      cashRateAskDir: direction(r.cashRateAsk, prev?.cashRateAsk),
    };
  }

  /**
   * Load the Pending Deals queue from USP_RF_GETDEALERPADORDER (@ActiveStatus = New).
   * Updates the `pending` signal; silent so a missing backend keeps the seed data.
   */
  fetchPending(clientName = ''): Observable<Deal[]> {
    return this.fetchOrders('New', clientName).pipe(tap((deals) => this._pending.set(deals)));
  }

  /** Load the Saved Deals queue (@ActiveStatus = Progressing). */
  fetchSaved(clientName = ''): Observable<Deal[]> {
    return this.fetchOrders('Progressing', clientName).pipe(tap((deals) => this._saved.set(deals)));
  }

  /** Full client + deal + contacts for one order (USP_RF_GETORDERCLIENTDETAILS). */
  getOrderDetails(recordId: number): Observable<OrderClientDetailsApi> {
    return this.api.get<OrderClientDetailsApi>(
      `${API.forex.dealerPadOrders}/${recordId}/details`,
      { context: silentContext() },
    );
  }

  /**
   * Submit/book an order (usp_rf_delerpad_orderbooking). Returns the full envelope
   * so the caller can read `success` (@Response) and `message` (@Response_Msg).
   */
  submitBooking(payload: Record<string, string>): Observable<ApiResponse<unknown>> {
    return this.api.postRaw<unknown>(`${API.forex.dealerPadOrders}/booking`, payload);
  }

  private fetchOrders(activeStatus: 'New' | 'Progressing', clientName: string): Observable<Deal[]> {
    const status: DealStatus = activeStatus === 'New' ? 'pending' : 'saved';
    return this.api
      .get<DealerPadOrderApi[]>(API.forex.dealerPadOrders, {
        params: { activeStatus, clientName },
        context: silentContext(),
      })
      .pipe(map((rows) => (rows ?? []).map((o) => orderToDeal(o, status))));
  }

  /** Nudge every rate slightly to simulate a live market feed. */
  tick(): void {
    this._rates.update((rates) =>
      rates.map((r) => {
        const drift = (Math.random() - 0.5) * (r.spotBid * 0.0004);
        const spotBid = round(r.spotBid + drift);
        const spotAsk = round(spotBid + (r.spotAsk - r.spotBid));
        // Cash rate moves with the market too; its arrows reflect this change.
        const cashRateBid = round(r.cashRateBid + drift);
        const cashRateAsk = round(cashRateBid + (r.cashRateAsk - r.cashRateBid));
        const dir: -1 | 0 | 1 = drift > 0 ? 1 : drift < 0 ? -1 : 0;
        return {
          ...r,
          spotBid,
          spotAsk,
          cashRateBid,
          cashRateAsk,
          spotBidDir: dir,
          spotAskDir: dir,
          cashRateBidDir: dir,
          cashRateAskDir: dir,
        };
      }),
    );
    this._lastUpdated.set(new Date());
  }

  /** Persist (or update) a deal in the saved queue. */
  saveDeal(d: Deal): Deal {
    const saved: Deal = { ...d, status: 'saved', updatedAt: new Date().toISOString() };
    this._saved.update((list) => upsert(list, saved));
    return saved;
  }

  /** Submit a deal: remove it from pending and record it as submitted in saved. */
  submitDeal(d: Deal): Deal {
    const submitted: Deal = { ...d, status: 'submitted', updatedAt: new Date().toISOString() };
    this._pending.update((list) => list.filter((x) => x.id !== d.id));
    this._saved.update((list) => upsert(list, submitted));
    return submitted;
  }

  removePending(dealId: string): void {
    this._pending.update((list) => list.filter((x) => x.id !== dealId));
  }

  newId(): string {
    return id();
  }
}

function upsert(list: Deal[], d: Deal): Deal[] {
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx === -1) return [d, ...list];
  const copy = [...list];
  copy[idx] = d;
  return copy;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Compare a new value with the previous one: 1 up, -1 down, 0 unchanged/unknown. */
function direction(current: number, previous: number | undefined): -1 | 0 | 1 {
  if (previous === undefined) return 0;
  return current > previous ? 1 : current < previous ? -1 : 0;
}

/** Map a USP_RF_GETDEALERPADORDER row to the dealer-pad Deal shape. */
function orderToDeal(o: DealerPadOrderApi, status: DealStatus): Deal {
  return deal({
    id: String(o.recordId),
    clientName: o.clientName,
    amount: o.amount,
    direction: (o.impExp ?? '').toLowerCase().startsWith('imp') ? 'Import' : 'Export',
    // Show the proc's TransactionDesc verbatim (e.g. "FORWARD CANCELATION").
    transactionType: (o.transactionDesc ?? '').trim(),
    status,
    updatedAt: o.createdDatetime,
    currencyPair: '',
  });
}
