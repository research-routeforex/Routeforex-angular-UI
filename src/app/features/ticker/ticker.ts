import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import {
  computeBrokenRate,
  CurrencyFutureQuote,
  ForexBoardRow,
  ForexNewsRow,
  FWD_CURRENCIES,
  netChange,
  pctChange,
  TICKER_TABS,
  TickerAccess,
  TickerSection,
} from './ticker.models';
import { TickerService } from './ticker.service';

@Component({
  selector: 'app-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatIconModule, DecimalPipe, DatePipe],
  templateUrl: './ticker.html',
  styleUrl: './ticker.scss',
})
export class TickerComponent implements OnDestroy {
  protected readonly svc = inject(TickerService);

  protected readonly tabs = TICKER_TABS;
  protected readonly active = signal<TickerSection>('Currency Future');

  // --- Metered access (paywall) ---------------------------------------------
  /** The caller's effective access; null until the first fetch resolves. */
  protected readonly access = signal<TickerAccess | null>(null);
  /** True once access is spent/expired — the paywall overlay covers the screen. */
  protected readonly locked = signal(false);
  /** Free-trial seconds remaining (null when unmetered). */
  protected readonly remaining = signal<number | null>(null);
  /** Seconds elapsed since the last heartbeat was flushed to the server. */
  private freeElapsed = 0;

  /** mm:ss label for the free-trial countdown chip. */
  protected readonly remainingLabel = computed(() => {
    const s = this.remaining();
    if (s == null) return '';
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  });

  protected readonly lockTitle = computed(() =>
    this.access()?.mode === 'Expired' ? 'Subscription expired' : 'Free preview ended',
  );

  protected readonly lockMessage = computed(() =>
    this.access()?.mode === 'Expired'
      ? 'Your access to the Ticker Live Rate screen has expired. Please contact your administrator to renew your subscription.'
      : 'Your 1-hour free preview of the Ticker Live Rate screen is over. Please subscribe to keep viewing live rates.',
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
  protected readonly fwdCurrencies = FWD_CURRENCIES;
  protected readonly selectedFwdCurrency = signal<string>(FWD_CURRENCIES[0]);
  /** Live forward-premium rows for the selected currency (from the API). */
  protected readonly fwdRows = this.svc.premium;

  // --- Broken Rate Calculator (quadrant 4) ----------------------------------
  protected readonly brokenDate = signal<string>(this.defaultBrokenDate());
  protected readonly brokenResult = computed(() =>
    computeBrokenRate(this.selectedFwdCurrency(), this.brokenDate()),
  );

  constructor() {
    // Resolve the paywall state first; only Clients (free trial / expired) get
    // locked — Admin and subscribers see the screen normally.
    this.svc.getAccess().subscribe({ next: (a) => this.applyAccess(a) });

    // Initial load so the board isn't blank before the first poll.
    this.svc.refresh();
    this.svc.loadPremium(this.selectedFwdCurrency());
    this.svc.loadNews();

    // Live feed — poll the rate feeds on a 1s tick.
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onTick());
  }

  /** Persist any unsent free-trial seconds when leaving the screen. */
  ngOnDestroy(): void {
    this.flushHeartbeat();
  }

  /** Poll cadence: refresh live data every other tick (~2s) to ease API load. */
  private tickCount = 0;

  /** One-second tick: meter free-trial time, then refresh the feeds (unless locked). */
  private onTick(): void {
    this.meterTick();
    // Once locked, stop pulling live data — the overlay covers the last frame.
    if (this.locked()) return;

    if (this.tickCount % 2 === 0) {
      this.svc.refresh();
      this.svc.loadPremium(this.selectedFwdCurrency());
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
    if (a.mode === 'FreeTrial') {
      const left = Math.max(0, (a.allowedSeconds ?? 0) - a.usedSeconds);
      this.remaining.set(left);
      this.locked.set(left <= 0);
    } else if (a.mode === 'Expired' || a.mode === 'FreeExpired') {
      this.remaining.set(0);
      this.locked.set(true);
    } else {
      // Unrestricted (Admin / other roles) or Subscribed — no metering.
      this.remaining.set(null);
      this.locked.set(false);
    }
  }

  /** Counts down the free-trial budget and flushes usage to the server. */
  private meterTick(): void {
    if (this.access()?.mode !== 'FreeTrial' || this.locked()) return;

    const left = (this.remaining() ?? 0) - 1;
    this.remaining.set(Math.max(0, left));
    this.freeElapsed++;

    if (left <= 0) {
      this.locked.set(true);
      this.flushHeartbeat();
    } else if (this.freeElapsed >= 15) {
      this.flushHeartbeat();
    }
  }

  /** Sends the accumulated free-trial seconds; the server is the source of truth. */
  private flushHeartbeat(): void {
    const seconds = this.freeElapsed;
    if (seconds <= 0) return;
    this.freeElapsed = 0;
    this.svc.sendHeartbeat(seconds).subscribe({
      next: (a) => {
        // Reconcile with the server (e.g. the budget was also spent in another tab).
        if (a.mode === 'FreeExpired' || a.mode === 'Expired') {
          this.access.set(a);
          this.remaining.set(0);
          this.locked.set(true);
        }
      },
    });
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
    this.svc.loadPremium(value);
  }
  protected onBrokenDate(value: string): void {
    this.brokenDate.set(value);
  }

  private defaultBrokenDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
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
