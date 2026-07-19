import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import {
  ExecutiveTotals,
  Section,
  SECTIONS,
  totalsOf,
} from '../executive-dashboard/executive-dashboard.models';
import { ExecutiveExpiryService } from './executive-expiry.service';

/**
 * Executive Expiry Transaction — read-only Import / Export expiry positions for one
 * client. Mirrors the Executive Dashboard's client + section controls and grid, but
 * shows details only: no Add New, no row actions, no live refresh.
 */
@Component({
  selector: 'app-executive-expiry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, SelectComponent, FormsModule, MatIconModule, DecimalPipe],
  templateUrl: './executive-expiry.html',
  styleUrl: './executive-expiry.scss',
})
export class ExecutiveExpiryComponent {
  protected readonly svc = inject(ExecutiveExpiryService);
  private readonly dropdowns = inject(DropdownService);

  protected readonly sections = SECTIONS;
  protected readonly section = signal<Section>('Import');

  /** Client selector — data loads only after a client is chosen. */
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly selectedClient = signal<number | null>(null);

  /** Once the first load finishes, auto-switch to Export if Import is empty. */
  private readonly autoSectionPending = signal(false);

  constructor() {
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
    this.svc.clear();

    // Reload whenever the client or section changes.
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
}
