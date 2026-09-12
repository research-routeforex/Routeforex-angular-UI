import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { DateFieldComponent } from '../../shared/components/date-field/date-field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import {
  BROKEN_ROW_COUNT,
  BrokenRateRow,
  CurrencyFutureQuote,
  emptyBrokenRow,
  ForexBoardRow,
  ForexNewsRow,
  FWD_CURRENCIES,
  netChange,
  pctChange,
  TICKER_TABS,
  TickerAccess,
  TickerSection,
} from './ticker.models';
import { NotificationService } from '../../core/services/notification.service';
import { TickerService } from './ticker.service';

@Component({
  selector: 'app-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DateFieldComponent, PageHeaderComponent, MatIconModule, DecimalPipe, DatePipe],
  templateUrl: './ticker.html',
  styleUrl: './ticker.scss',
})
export class TickerComponent {
  protected readonly svc = inject(TickerService);
  private readonly notify = inject(NotificationService);

  protected readonly tabs = TICKER_TABS;
  protected readonly active = signal<TickerSection>('Forex');

  // --- Metered access (paywall) ---------------------------------------------
  /** The caller's effective access; null until the first fetch resolves. */
  protected readonly access = signal<TickerAccess | null>(null);
  /** True when the caller has no access — the paywall overlay covers the screen. */
  protected readonly locked = signal(false);

  protected readonly lockTitle = computed(() => 'Ticker access required');

  protected readonly lockMessage = computed(
    () =>
      'You don’t have access to the Ticker Live Rate screen. Please contact your administrator to get access.',
  );

  /** Full-screen (kiosk) mode — hides the app chrome, shows only tabs + content. */
  protected readonly fullscreen = signal(false);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  /** Live Forex News rows (Forex tab quadrant 3 + the NEWS tab) from usp_RF_Mast_ForexLiveScreen. */
  protected readonly forexNews = this.svc.news;
  /** The news row shown in the detail dialog, or null when closed. */
  protected readonly selectedNews = signal<ForexNewsRow | null>(null);

  // --- Forex board (quadrant 1) ---------------------------------------------
  protected readonly pairSearch = signal('');
  protected readonly deletedPairs = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedPair = signal<string | null>(null);

  protected readonly boardRows = computed<ForexBoardRow[]>(() => {
    const term = this.pairSearch().trim().toLowerCase();
    const deleted = this.deletedPairs();
    return this.svc
      .board()
      .filter((r) => !deleted.has(r.description))
      .filter((r) => !term || r.description.toLowerCase().includes(term));
  });

  // --- Forward Premium (quadrant 2) -----------------------------------------
  /** Currency options, bound from the backend (TPO_Mast_ForexPremium); falls back
   *  to the built-in list until the API responds / if it returns nothing. */
  protected readonly fwdCurrencies = computed<string[]>(() => {
    const list = this.svc.premiumCurrencies();
    return list.length ? list : FWD_CURRENCIES;
  });
  protected readonly selectedFwdCurrency = signal<string>(FWD_CURRENCIES[0]);
  /** Live forward-premium rows for the selected currency (from the API). */
  protected readonly fwdRows = this.svc.premium;

  // --- Broken Rate Calculator (quadrant 4) ----------------------------------
  /** 5 independent rows; each fetches a forward rate when its date is picked. */
  protected readonly brokenRows = signal<BrokenRateRow[]>(
    Array.from({ length: BROKEN_ROW_COUNT }, () => emptyBrokenRow()),
  );

  /** Spot bid/ask taken from the Forward Premium SPOT row (drives each row's Spot columns). */
  protected readonly spot = computed<{ bid: number; ask: number } | null>(() => {
    const row = this.fwdRows().find((r) => (r.description ?? '').toUpperCase() === 'SPOT');
    return row ? { bid: row.bid, ask: row.ask } : null;
  });

  constructor() {
    // Resolve access first: a Client without a live Ticker Live Screen Right entry is
    // locked out immediately; Admin/other roles and subscribers see the screen normally.
    this.svc.getAccess().subscribe({ next: (a) => this.applyAccess(a) });

    // Initial load so the board isn't blank before the first poll.
    this.svc.refresh();
    this.svc.loadPremium(this.selectedFwdCurrency()).subscribe();
    this.svc.loadNews();

    // Bind the Forward Premium currency dropdown from the backend; default to the
    // first option (and reload its grid) when the current pick isn't in the list.
    this.svc.loadPremiumCurrencies().subscribe((list) => {
      if (list.length && !list.includes(this.selectedFwdCurrency())) {
        this.selectedFwdCurrency.set(list[0]);
        this.svc.loadPremium(list[0]).subscribe();
      }
    });

    // Live feed — poll the rate feeds on a 1s tick.
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onTick());
  }

  /** Poll cadence: refresh live data every other tick (~2s) to ease API load. */
  private tickCount = 0;

  /** One-second tick: refresh the feeds (unless locked). */
  private onTick(): void {
    // When locked (no access), stop pulling live data — the overlay covers the screen.
    if (this.locked()) return;

    if (this.tickCount % 2 === 0) {
      this.svc.refresh();
      this.svc.loadPremium(this.selectedFwdCurrency()).subscribe();
    }
    // News changes rarely — refresh it about once a minute, not every poll.
    if (this.tickCount % 60 === 0) {
      this.svc.loadNews();
    }
    this.tickCount++;
  }

  /** Maps the server access into the local paywall state. */
  private applyAccess(a: TickerAccess): void {
    this.access.set(a);
    // A Client with no live entry → locked; Subscribed / Unrestricted → open.
    this.locked.set(a.mode === 'FreeExpired' || a.mode === 'Expired');
  }

  protected select(section: TickerSection): void {
    this.active.set(section);
  }

  // --- Forex News detail dialog ---------------------------------------------
  protected openNews(row: ForexNewsRow): void {
    this.selectedNews.set(row);
  }
  protected closeNews(): void {
    this.selectedNews.set(null);
  }

  // --- Full-screen mode -----------------------------------------------------
  protected toggleFullscreen(): void {
    const next = !this.fullscreen();
    this.fullscreen.set(next);
    try {
      if (next) {
        this.root()?.nativeElement?.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    } catch {
      // Native fullscreen may be blocked; the fixed overlay still applies.
    }
  }

  /** Keep state in sync when the user leaves native fullscreen (e.g. via Esc). */
  @HostListener('document:fullscreenchange')
  protected onFullscreenChange(): void {
    if (!document.fullscreenElement && this.fullscreen()) {
      this.fullscreen.set(false);
    }
  }

  /** Close the news dialog, else exit overlay-only fullscreen, on Esc. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.selectedNews()) {
      this.selectedNews.set(null);
      return;
    }
    if (this.fullscreen() && !document.fullscreenElement) {
      this.fullscreen.set(false);
    }
  }

  // --- Forex board actions --------------------------------------------------
  protected onPairSearch(value: string): void {
    this.pairSearch.set(value);
  }
  protected selectRow(pair: string): void {
    this.selectedPair.set(pair);
  }
  protected deletePair(): void {
    const sel = this.selectedPair();
    if (!sel) return;
    this.deletedPairs.update((set) => new Set(set).add(sel));
    this.selectedPair.set(null);
  }
  /** Restore any rows that were removed from the board. */
  protected addPair(): void {
    this.deletedPairs.set(new Set());
  }

  protected onFwdCurrency(value: string): void {
    this.selectedFwdCurrency.set(value);
    // Reload the premium grid (refreshes the SPOT row) and then re-fetch every
    // Broken Rate row that already has a value date, so the calculator reflects
    // the newly selected currency instead of keeping the previous currency's rates.
    this.svc.loadPremium(value).subscribe(() => this.refreshBrokenRows());
  }

  /** Re-run the forward-rate fetch for each Broken Rate row that has a value date. */
  private refreshBrokenRows(): void {
    this.brokenRows().forEach((row, index) => {
      if (row.valueDate) this.onBrokenRowDate(index, row.valueDate);
    });
  }
  /** A date was picked in a Broken Rate row → fetch that row's forward rate. */
  protected onBrokenRowDate(index: number, value: string): void {
    this.patchBrokenRow(index, { valueDate: value });

    if (!value) {
      this.clearBrokenRow(index);
      return;
    }

    // Split the selected premium currency (e.g. "USDINR") into from/to halves.
    const ccy = this.selectedFwdCurrency();
    const currencyFrom = ccy.slice(0, 3);
    const currencyTo = ccy.slice(3, 6);
    if (!currencyFrom || !currencyTo) {
      this.notify.error('Select a currency in the Forward Premium panel first.');
      return;
    }

    this.patchBrokenRow(index, { loading: true });
    // value is already yyyy-MM-dd from app-date-field.
    this.svc.forwardRate(value, currencyFrom, currencyTo).subscribe((data) => {
      if (data.length === 0) {
        this.notify.error('No forward rate found.');
        this.clearBrokenRow(index);
        return;
      }
      const d = data[0];
      const spot = this.spot();
      this.patchBrokenRow(index, {
        loading: false,
        spotBid: spot?.bid ?? null,
        spotAsk: spot?.ask ?? null,
        swapBid: d.bidInrSwap,
        swapAsk: d.askInrSwap,
        fwdBid: d.bidFinalRate,
        fwdAsk: d.askFinalRate,
      });
    });
  }

  private patchBrokenRow(index: number, patch: Partial<BrokenRateRow>): void {
    this.brokenRows.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  /** Blank a row's result cells (keeps its picked date). */
  private clearBrokenRow(index: number): void {
    this.patchBrokenRow(index, {
      loading: false,
      spotBid: null,
      spotAsk: null,
      swapBid: null,
      swapAsk: null,
      fwdBid: null,
      fwdAsk: null,
    });
  }

  protected netChg(q: CurrencyFutureQuote): number {
    return netChange(q);
  }
  protected pctChg(q: CurrencyFutureQuote): number {
    return pctChange(q);
  }

  /** Direction class for a tick (-1/0/1) → '', 'up', 'down'. */
  protected dirClass(dir: number): string {
    if (dir > 0) return 'up';
    if (dir < 0) return 'down';
    return '';
  }
}
