import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
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
import { ScreenAccessService } from './screen-access.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import {
  buildForwardPremium,
  computeBrokenRate,
  CurrencyFutureQuote,
  FOREX_NEWS,
  ForexBoardRow,
  FWD_CURRENCIES,
  netChange,
  NEWS_ITEMS,
  pctChange,
  TICKER_TABS,
  TickerSection,
} from './ticker.models';
import { TickerService } from './ticker.service';

@Component({
  selector: 'app-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatIconModule, DecimalPipe, DatePipe, LowerCasePipe],
  templateUrl: './ticker.html',
  styleUrl: './ticker.scss',
})
export class TickerComponent implements OnDestroy {
  protected readonly svc = inject(TickerService);
  private readonly access = inject(ScreenAccessService);

  protected readonly tabs = TICKER_TABS;
  protected readonly active = signal<TickerSection>('Currency Future');

  // --- Metered access (daily time budget) -----------------------------------
  /** Route key the budget is tracked against. */
  private readonly accessRoute = '/ticker';
  /** Daily allowance in minutes (null = unmetered/unlimited). */
  private readonly allowedMinutes = signal<number | null>(null);
  /** Seconds already used today (server value at load time). */
  private readonly usedSeconds = signal(0);
  /** Seconds counted locally since the screen opened. */
  private readonly localElapsed = signal(0);
  /** Seconds already persisted to the server (to send only the delta). */
  private lastSynced = 0;

  /** True once metering for this screen applies (an allowance is set). */
  protected readonly metered = computed(() => this.allowedMinutes() != null);

  /** Seconds remaining today, or null when unmetered. */
  protected readonly remainingSeconds = computed<number | null>(() => {
    const minutes = this.allowedMinutes();
    if (minutes == null) return null;
    return Math.max(0, minutes * 60 - this.usedSeconds() - this.localElapsed());
  });

  /** Budget spent — the screen is paywalled. */
  protected readonly locked = computed(() => this.metered() && this.remainingSeconds() === 0);

  /** mm:ss label for the remaining time. */
  protected readonly remainingLabel = computed(() => {
    const total = this.remainingSeconds() ?? 0;
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  });

  /** Daily allowance label for the paywall ("15 min"). */
  protected readonly allowanceLabel = computed(() => `${this.allowedMinutes() ?? 0} min`);

  /** Toggles the "payment coming soon" note on the paywall. */
  protected readonly payRequested = signal(false);

  /** Full-screen (kiosk) mode — hides the app chrome, shows only tabs + content. */
  protected readonly fullscreen = signal(false);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  protected readonly news = NEWS_ITEMS;
  protected readonly forexNews = FOREX_NEWS;

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
  protected readonly fwdRows = computed(() => buildForwardPremium(this.selectedFwdCurrency()));

  // --- Broken Rate Calculator (quadrant 4) ----------------------------------
  protected readonly brokenDate = signal<string>(this.defaultBrokenDate());
  protected readonly brokenResult = computed(() =>
    computeBrokenRate(this.selectedFwdCurrency(), this.brokenDate()),
  );

  constructor() {
    // Load the daily budget (allowance + seconds already used today). Fails open:
    // if the call errors, the screen stays unmetered rather than locking the user out.
    this.access.get(this.accessRoute).subscribe((a) => {
      this.allowedMinutes.set(a.allowedMinutes);
      this.usedSeconds.set(a.usedSeconds);
    });

    // Live feed — advance quotes once a second, counting metered time and
    // freezing once the budget is spent.
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.onTick());
  }

  /** One-second tick: freeze when locked, otherwise advance quotes and count time. */
  private onTick(): void {
    if (this.locked()) return;
    this.svc.tick();
    if (!this.metered()) return;

    this.localElapsed.update((s) => s + 1);
    // Persist roughly every 10s, and immediately when the budget runs out.
    if (this.localElapsed() - this.lastSynced >= 10 || this.locked()) {
      this.flushUsage();
    }
  }

  /** Send the seconds not yet persisted to the server. */
  private flushUsage(): void {
    const delta = this.localElapsed() - this.lastSynced;
    if (delta <= 0) return;
    this.lastSynced += delta;
    this.access.heartbeat(this.accessRoute, delta).subscribe({
      // On failure, roll back so the next beat resends these seconds.
      error: () => (this.lastSynced -= delta),
    });
  }

  ngOnDestroy(): void {
    this.flushUsage();
  }

  protected requestPayment(): void {
    this.payRequested.set(true);
  }

  protected select(section: TickerSection): void {
    this.active.set(section);
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

  /** Exit overlay-only fullscreen with Esc when native fullscreen isn't active. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
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
