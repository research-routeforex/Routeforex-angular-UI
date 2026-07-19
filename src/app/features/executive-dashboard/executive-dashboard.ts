import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import { ExecutiveUcDialogComponent } from './executive-uc-dialog/executive-uc-dialog';
import {
  ExecutiveDashboardRow,
  ExecutiveTotals,
  Section,
  SECTIONS,
  totalsOf,
  UcMode,
} from './executive-dashboard.models';
import { ExecutiveDashboardService } from './executive-dashboard.service';

/**
 * Executive Dashboard — deal-level Import / Export positions for one client.
 * Mirrors the Management Dashboard's client + section controls, but shows the raw
 * deal rows (bank, party, amounts, forward cover, hedge/WC cost) in a flat grid.
 */
@Component({
  selector: 'app-executive-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    SelectComponent,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './executive-dashboard.html',
  styleUrl: './executive-dashboard.scss',
})
export class ExecutiveDashboardComponent {
  protected readonly svc = inject(ExecutiveDashboardService);
  private readonly dropdowns = inject(DropdownService);
  private readonly dialog = inject(MatDialog);

  protected readonly sections = SECTIONS;
  protected readonly section = signal<Section>('Import');

  /** Client selector — data loads only after a client is chosen. */
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly selectedClient = signal<number | null>(null);

  /** Once the first load finishes, auto-switch to Export if Import is empty. */
  private readonly autoSectionPending = signal(false);

  constructor() {
    // Client picker from the common USP_RF_BINDDROPDOWN (@Type = 'Client').
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
    this.svc.clear();

    // Reload (with loading state) whenever the client or section changes.
    effect(() => {
      const clientId = this.selectedClient();
      const section = this.section();
      if (clientId == null) return;
      this.svc.load(clientId, section);
    });

    // After a client is picked, jump to Export if the default Import tab is empty.
    effect(() => {
      if (!this.autoSectionPending() || !this.svc.loaded()) return;
      const importHasData = this.svc.rows().some((r) => (r.type ?? '').toLowerCase().startsWith('imp'));
      this.autoSectionPending.set(false);
      if (!importHasData && this.section() === 'Import') this.section.set('Export');
    });

    // Live feed: silently re-fetch every 2 seconds (no loading flicker).
    interval(2000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const clientId = this.selectedClient();
        if (clientId == null) return;
        this.svc.load(clientId, this.section(), true);
      });
  }

  /** Rows for the selected tab (the proc echoes each row's Type). */
  protected readonly rows = computed(() =>
    this.svc.rows().filter((r) => (r.type ?? '').toLowerCase().startsWith(this.section() === 'Import' ? 'imp' : 'exp')),
  );

  protected readonly totals = computed<ExecutiveTotals>(() => totalsOf(this.rows()));

  protected readonly hasClient = computed(() => this.selectedClient() != null);
  protected readonly isEmpty = computed(
    () => this.hasClient() && this.svc.loaded() && this.rows().length === 0,
  );

  /** True on the Import tab (drives the type-specific columns). */
  protected readonly isImport = computed(() => this.section() === 'Import');

  protected selectSection(section: Section): void {
    if (section === this.section()) return;
    this.section.set(section);
  }

  protected selectClient(client: number | string | null): void {
    const id = client == null || client === '' ? null : Number(client);
    if (id === this.selectedClient()) return;
    this.selectedClient.set(id);
    this.section.set('Import');
    this.autoSectionPending.set(id != null);
  }

  /** Open the Utilization / Cancellation dialog for a deal; reload the grid on save. */
  protected openUc(mode: UcMode, row: ExecutiveDashboardRow): void {
    const clientId = this.selectedClient();
    if (clientId == null) return;
    this.dialog
      .open(ExecutiveUcDialogComponent, {
        width: '640px',
        maxWidth: '92vw',
        autoFocus: false,
        panelClass: 'uc-dialog',
        data: { mode, row, clientId },
      })
      .afterClosed()
      .subscribe((saved?: boolean) => {
        if (saved) this.svc.load(clientId, this.section());
      });
  }
}
