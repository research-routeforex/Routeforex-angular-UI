import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import {
  aggregate,
  currencySymbol,
  DashboardLeaf,
  DisplayRow,
  INR_SYMBOL,
  Metrics,
  Section,
  SECTIONS,
} from './management-dashboard.models';
import { ManagementDashboardService } from './management-dashboard.service';

/**
 * Headline figures shown in the summary strip. Amounts (exposure, forward,
 * unhedged) are the grand totals of the table's foreign-currency columns;
 * mark-to-market is in INR. Kept identical to the table aggregation so the
 * cards always match the rows below.
 */
interface SectionTotals {
  outstandingExposure: number;
  forwardCover: number;
  amountUnhedged: number;
  markToMarket: number;
  hedgeRatio: number;
}

@Component({
  selector: 'app-management-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    SelectComponent,
    FormsModule,
    MatIconModule,
    DecimalPipe,
    PercentPipe,
    DatePipe,
  ],
  templateUrl: './management-dashboard.html',
  styleUrl: './management-dashboard.scss',
})
export class ManagementDashboardComponent {
  protected readonly svc = inject(ManagementDashboardService);
  private readonly dropdowns = inject(DropdownService);

  protected readonly sections = SECTIONS;
  protected readonly section = signal<Section>('Import');

  /** Client selector — data loads only after a client is chosen. */
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly selectedClient = signal<number | null>(null);

  /** Optional Client Bank filter — when set, only that bank's positions are shown. */
  protected readonly bankOptions = signal<SelectOption[]>([]);
  protected readonly selectedBank = signal<number | null>(null);

  /** Exposed to the template for sign-aware currency formatting. */
  protected readonly inr = INR_SYMBOL;
  protected readonly abs = Math.abs;

  /** Expanded currency ids (e.g. 'USD') and month ids (e.g. 'USD|2026-08'). */
  private readonly expandedCurrencies = signal<ReadonlySet<string>>(new Set());
  private readonly expandedMonths = signal<ReadonlySet<string>>(new Set());

  /**
   * Set when a new client is picked: once the first load completes, if the Import
   * tab has no data we auto-select the Export tab. Consumed after one check so it
   * never fights the user's own tab choice.
   */
  private readonly autoSectionPending = signal(false);

  constructor() {
    // Client list (key = ClientID, label = ClientName) for the picker, scoped to
    // the signed-in user via GetClientInformation.
    this.svc.getClients().subscribe((opts) => this.clientOptions.set(opts));
    this.svc.clear();

    // Reload (with the loading state) whenever the client, section or bank changes.
    effect(() => {
      const clientId = this.selectedClient();
      const section = this.section();
      const bankId = this.selectedBank();
      if (clientId == null) return;
      this.svc.load(clientId, section, bankId);
    });

    // After a client is picked, if the (default) Import tab has no data once the
    // load completes, auto-select the Export tab. Runs once per client selection.
    effect(() => {
      if (!this.autoSectionPending() || !this.svc.loaded()) return;
      const importHasData = this.svc.leaves().some((l) => l.section === 'Import');
      this.autoSectionPending.set(false);
      if (!importHasData && this.section() === 'Import') {
        this.section.set('Export');
        this.resetDrilldown();
      }
    });

    // Live feed: re-fetch from the DB every 2 seconds, silently (no loading
    // flicker, drill-down stays open, last good data kept if a poll fails).
    interval(2000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const clientId = this.selectedClient();
        if (clientId == null) return;
        this.svc.load(clientId, this.section(), this.selectedBank(), true);
      });
  }

  /**
   * Leaves for the selected tab. The proc returns both Import and Export rows
   * (each tagged with a Type), so filter to the chosen section here.
   */
  private readonly sectionLeaves = computed(() =>
    this.svc.leaves().filter((l) => l.section === this.section()),
  );

  /** Flattened Currency → Month-Year → Date rows, honouring the expanded state. */
  protected readonly rows = computed<DisplayRow[]>(() => {
    const leaves = this.sectionLeaves();
    const openCcy = this.expandedCurrencies();
    const openMonth = this.expandedMonths();
    const out: DisplayRow[] = [];

    // Group by currency (insertion order = the order rows arrive from the proc).
    const byCurrency = new Map<string, DashboardLeaf[]>();
    for (const leaf of leaves) {
      const list = byCurrency.get(leaf.currency);
      if (list) list.push(leaf);
      else byCurrency.set(leaf.currency, [leaf]);
    }

    for (const [currency, ccyLeaves] of byCurrency) {
      const symbol = currencySymbol(currency);
      const ccyExpanded = openCcy.has(currency);

      out.push({
        id: currency,
        level: 0,
        label: currency,
        currency,
        symbol,
        expandable: true,
        expanded: ccyExpanded,
        metrics: aggregate(ccyLeaves),
      });

      if (!ccyExpanded) continue;

      // Group this currency's leaves by month-year, sorted by month key.
      const byMonth = new Map<string, { label: string; leaves: DashboardLeaf[] }>();
      for (const leaf of ccyLeaves) {
        const bucket = byMonth.get(leaf.monthKey);
        if (bucket) bucket.leaves.push(leaf);
        else byMonth.set(leaf.monthKey, { label: leaf.monthLabel, leaves: [leaf] });
      }

      for (const monthKey of [...byMonth.keys()].sort()) {
        const bucket = byMonth.get(monthKey)!;
        const monthId = `${currency}|${monthKey}`;
        const monthExpanded = openMonth.has(monthId);

        out.push({
          id: monthId,
          level: 1,
          label: bucket.label,
          currency,
          symbol,
          expandable: true,
          expanded: monthExpanded,
          metrics: aggregate(bucket.leaves),
        });

        if (!monthExpanded) continue;

        // Date leaves within the month, sorted by date key.
        const dates = [...bucket.leaves].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        for (const leaf of dates) {
          out.push({
            id: `${monthId}|${leaf.dateKey}`,
            level: 2,
            label: leaf.date,
            currency,
            symbol,
            expandable: false,
            expanded: false,
            metrics: aggregate([leaf]),
          });
        }
      }
    }

    return out;
  });

  /**
   * Section headline totals — grand totals of the table's columns (so the cards
   * always match the rows). Amounts are summed in foreign-currency units; MTM is
   * the proc's INR mark-to-market; hedge ratio is total forward / total exposure.
   */
  protected readonly totals = computed<SectionTotals>(() => {
    let outstandingExposure = 0;
    let forwardCover = 0;
    let markToMarket = 0;

    for (const leaf of this.sectionLeaves()) {
      outstandingExposure += leaf.outstandingExposure;
      forwardCover += leaf.forwardContractAmount;
      markToMarket += leaf.markToMarket;
    }

    return {
      outstandingExposure,
      forwardCover,
      amountUnhedged: outstandingExposure - forwardCover,
      markToMarket,
      hedgeRatio: outstandingExposure ? forwardCover / outstandingExposure : 0,
    };
  });

  /**
   * Currency symbol for the summary amount cards: the single currency's symbol
   * when the client trades only one, otherwise blank (units can't be mixed).
   */
  protected readonly amountSymbol = computed(() => {
    const currencies = new Set(this.sectionLeaves().map((l) => l.currency));
    return currencies.size === 1 ? currencySymbol([...currencies][0]) : '';
  });

  /** True once a client is picked (controls the empty-state prompt). */
  protected readonly hasClient = computed(() => this.selectedClient() != null);

  /** True when a load finished but the selected tab has no rows. */
  protected readonly isEmpty = computed(
    () => this.hasClient() && this.svc.loaded() && this.sectionLeaves().length === 0,
  );

  protected selectSection(section: Section): void {
    if (section === this.section()) return;
    this.section.set(section);
    this.resetDrilldown();
  }

  protected selectClient(client: number | string | null): void {
    const id = client == null || client === '' ? null : Number(client);
    if (id === this.selectedClient()) return;
    this.selectedClient.set(id);

    // Reload the bank filter for the new client (and clear any prior selection).
    this.selectedBank.set(null);
    this.bankOptions.set([]);
    if (id != null) this.dropdowns.get('ClientBank', id).subscribe((o) => this.bankOptions.set(o));

    // Start each client on the Import tab; auto-switch to Export after load if empty.
    this.section.set('Import');
    this.autoSectionPending.set(id != null);
    this.resetDrilldown();
  }

  /** Filter positions to a single Client Bank (null = all banks). */
  protected selectBank(bank: number | string | null): void {
    const id = bank == null || bank === '' ? null : Number(bank);
    if (id === this.selectedBank()) return;
    this.selectedBank.set(id);
    this.resetDrilldown();
  }

  /** Collapse all expanded rows for a clean view after a filter change. */
  private resetDrilldown(): void {
    this.expandedCurrencies.set(new Set());
    this.expandedMonths.set(new Set());
  }

  protected toggle(row: DisplayRow): void {
    if (!row.expandable) return;
    if (row.level === 0) {
      this.expandedCurrencies.update((set) => toggleId(set, row.id));
    } else if (row.level === 1) {
      this.expandedMonths.update((set) => toggleId(set, row.id));
    }
  }

  /** Helps the template colour MTM cells without a method call per cell. */
  protected mtmClass(m: Metrics): string {
    if (m.markToMarket > 0) return 'pos';
    if (m.markToMarket < 0) return 'neg';
    return '';
  }
}

function toggleId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
