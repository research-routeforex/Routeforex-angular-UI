import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import { BroadcastGroup } from './broadcast-group-master.model';
import { BroadcastGroupMasterService } from './broadcast-group-master.service';

interface ClientItem {
  id: number;
  name: string;
}

@Component({
  selector: 'app-broadcast-group-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './broadcast-group-master.html',
  styleUrl: './broadcast-group-master.scss',
})
export class BroadcastGroupMasterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BroadcastGroupMasterService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<BroadcastGroup[]>([]);

  /** All clients ({ id, name }) for the checkbox list. */
  protected readonly clients = signal<ClientItem[]>([]);
  /** Currently ticked client ids. */
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  /** Filter text for the client checkbox list. */
  protected readonly clientFilter = signal('');

  /** null = form hidden; 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    recordID: [0],
    groupName: ['', [Validators.required, Validators.maxLength(100)]],
    activeStatus: ['Active'],
  });

  // ---- Client checkbox list -------------------------------------------------
  protected readonly filteredClients = computed<ClientItem[]>(() => {
    const term = this.clientFilter().trim().toLowerCase();
    const list = this.clients();
    return term ? list.filter((c) => c.name.toLowerCase().includes(term)) : list;
  });
  protected readonly selectedCount = computed(() => this.selected().size);
  /** True when every currently-visible (filtered) client is ticked. */
  protected readonly allFilteredSelected = computed(() => {
    const list = this.filteredClients();
    const sel = this.selected();
    return list.length > 0 && list.every((c) => sel.has(c.id));
  });

  // ---- Groups list (search + pagination) ------------------------------------
  protected readonly groupFilter = signal('');
  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filtered = computed<BroadcastGroup[]>(() => {
    const term = this.groupFilter().trim().toLowerCase();
    const rows = this.allRows();
    return term ? rows.filter((r) => (r.groupName ?? '').toLowerCase().includes(term)) : rows;
  });
  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<BroadcastGroup[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((opts) => this.clients.set(this.toClients(opts)));
    this.load();
  }

  private toClients(opts: SelectOption[]): ClientItem[] {
    return opts
      .map((o) => ({ id: Number(o.value), name: o.label }))
      .filter((c) => !Number.isNaN(c.id));
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getGroups()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  /** id → name lookup for resolving a group's CSV of client ids to names. */
  private readonly clientNameById = computed(
    () => new Map(this.clients().map((c) => [c.id, c.name])),
  );

  /** Client count for a group row (from its CSV). */
  protected clientCount(row: BroadcastGroup): number {
    return this.parseIds(row.clientIDs).length;
  }

  /** Resolved, comma-separated client names for a group row (falls back to the id). */
  protected clientNames(row: BroadcastGroup): string {
    const map = this.clientNameById();
    return this.parseIds(row.clientIDs)
      .map((id) => map.get(id) ?? String(id))
      .join(', ');
  }

  private parseIds(csv: string | null | undefined): number[] {
    return (csv ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
  }

  // ---- Checkbox handlers ----------------------------------------------------
  protected isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  protected toggleClient(id: number, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Tick/untick every client currently visible under the filter. */
  protected toggleAllFiltered(checked: boolean): void {
    const ids = this.filteredClients().map((c) => c.id);
    this.selected.update((set) => {
      const next = new Set(set);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  // ---- Form actions ---------------------------------------------------------
  protected startAdd(): void {
    this.form.reset({ recordID: 0, groupName: '', activeStatus: 'Active' });
    this.selected.set(new Set());
    this.clientFilter.set('');
    this.editingId.set(0);
  }

  protected startEdit(row: BroadcastGroup): void {
    this.form.reset({
      recordID: row.recordID,
      groupName: row.groupName,
      activeStatus: row.activeStatus || 'Active',
    });
    this.selected.set(new Set(this.parseIds(row.clientIDs)));
    this.clientFilter.set('');
    this.editingId.set(row.recordID);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.selected().size === 0) {
      this.notify.error('Select at least one client.');
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .save({
        recordID: v.recordID,
        groupName: v.groupName,
        clientIDs: [...this.selected()].join(','),
        activeStatus: v.activeStatus,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Broadcast group saved.');
        this.editingId.set(null);
        this.load();
      });
  }

  // ---- List paging / filtering ----------------------------------------------
  protected setGroupFilter(value: string): void {
    this.groupFilter.set(value);
    this.pageNumber.set(1);
  }
  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
  }
  protected first(): void {
    this.pageNumber.set(1);
  }
  protected prev(): void {
    this.pageNumber.update((n) => Math.max(1, n - 1));
  }
  protected next(): void {
    this.pageNumber.update((n) => Math.min(this.totalPages(), n + 1));
  }
  protected last(): void {
    this.pageNumber.set(this.totalPages());
  }
}
