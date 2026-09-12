import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { BroadcastGroupMasterService } from '../broadcast-group-master/broadcast-group-master.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import {
  BroadcastMessage,
  BroadcastType,
  SaveBroadcastMessage,
  UpdateBroadcastMessage,
} from './broadcast-message.model';
import { BroadcastMessageService } from './broadcast-message.service';

interface Recipient {
  id: number;
  name: string;
}

@Component({
  selector: 'app-broadcast-message',
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
  templateUrl: './broadcast-message.html',
  styleUrl: './broadcast-message.scss',
})
export class BroadcastMessageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BroadcastMessageService);
  private readonly groupService = inject(BroadcastGroupMasterService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly sending = signal(false);
  /** true = the "Add New" send form is showing; false = search/list. */
  protected readonly adding = signal(false);

  private readonly allRows = signal<BroadcastMessage[]>([]);

  // ---- Recipients (clients or groups) ---------------------------------------
  /** 'group' = broadcast groups, 'client' = individual clients. */
  protected readonly recipientMode = signal<'client' | 'group'>('group');
  protected readonly clients = signal<Recipient[]>([]);
  protected readonly groups = signal<Recipient[]>([]);
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  protected readonly recipientFilter = signal('');

  protected readonly typeOptions: SelectOption[] = [
    { value: 'Normal', label: 'Normal' },
    { value: 'TradingCalls', label: 'Trading Calls' },
    { value: 'SiteNews', label: 'Site News' },
  ];
  protected readonly buySellOptions: SelectOption[] = [
    { value: 'Buy', label: 'Buy' },
    { value: 'Sell', label: 'Sell' },
  ];
  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  protected readonly exitTypeOptions: SelectOption[] = [
    { value: 'Stop_Close', label: 'Stop / Close' },
    { value: 'TargetPrice', label: 'Target Price' },
    { value: 'Recommend', label: 'Recommend' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    // Nullable: nothing is selected by default (shows the "Select" option).
    sourceName: this.fb.control<BroadcastType | null>(null),
    subject: [''],
    siteName: [''],
    buySell: [''],
    currency: [''],
    expiry: [''],
    entryPrice: [''],
    targetPrice: [''],
    stopClose: [''],
    fileHeader: [''],
    fileFooter: [''],
  });

  /** The currently-selected message type (null = "Select", drives which fields show). */
  protected readonly type = signal<BroadcastType | null>(null);

  /** Picked File Header / Footer images as data-URLs (uploaded on send). */
  private readonly fileHeaderData = signal<string | null>(null);
  private readonly fileFooterData = signal<string | null>(null);

  // ---- Details (view an existing broadcast + its header/footer images) -------
  protected readonly detailsRow = signal<BroadcastMessage | null>(null);
  /** Object URLs of the detailed row's header/footer images (null = none/loading). */
  protected readonly detailsHeaderUrl = signal<string | null>(null);
  protected readonly detailsFooterUrl = signal<string | null>(null);

  // ---- Trading-call edit (close) --------------------------------------------
  /** The trading-call row being edited, or null. */
  protected readonly editRow = signal<BroadcastMessage | null>(null);
  protected readonly updating = signal(false);
  protected readonly editForm = this.fb.nonNullable.group({
    status: this.fb.control<string | null>('Active'),
    exitType: this.fb.control<string | null>(null),
    exitRate: [''],
  });

  protected readonly recipients = computed<Recipient[]>(() =>
    this.recipientMode() === 'group' ? this.groups() : this.clients(),
  );
  protected readonly filteredRecipients = computed<Recipient[]>(() => {
    const term = this.recipientFilter().trim().toLowerCase();
    const list = this.recipients();
    return term ? list.filter((r) => r.name.toLowerCase().includes(term)) : list;
  });
  protected readonly selectedCount = computed(() => this.selected().size);
  protected readonly allFilteredSelected = computed(() => {
    const list = this.filteredRecipients();
    const sel = this.selected();
    return list.length > 0 && list.every((r) => sel.has(r.id));
  });

  // ---- List (search) --------------------------------------------------------
  protected readonly listFilter = signal('');
  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filtered = computed<BroadcastMessage[]>(() => {
    const term = this.listFilter().trim().toLowerCase();
    const rows = this.allRows();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.subject ?? '').toLowerCase().includes(term) ||
        this.recipientNames(r).toLowerCase().includes(term),
    );
  });
  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<BroadcastMessage[]>(() => {
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
    this.form.controls.sourceName.valueChanges.subscribe((v) => this.type.set(v));
    this.dropdowns.get('Client').subscribe((opts) => this.clients.set(this.toRecipients(opts)));
    this.groupService.getGroups().subscribe((rows) =>
      this.groups.set(rows.map((g) => ({ id: g.recordID, name: g.groupName }))),
    );
    this.load();
  }

  private toRecipients(opts: SelectOption[]): Recipient[] {
    return opts
      .map((o) => ({ id: Number(o.value), name: o.label }))
      .filter((r) => !Number.isNaN(r.id));
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  /** Reloads the broadcast list from the server (refresh icon). */
  protected refresh(): void {
    if (this.loading()) return;
    this.load();
  }

  // ---- Row name resolution --------------------------------------------------
  private readonly clientNameById = computed(
    () => new Map(this.clients().map((c) => [c.id, c.name])),
  );
  private readonly groupNameById = computed(
    () => new Map(this.groups().map((g) => [g.id, g.name])),
  );

  /** Resolved recipient names for a broadcast row (groups or clients, per IsGroup). */
  protected recipientNames(row: BroadcastMessage): string {
    const map = row.isGroup === '1' ? this.groupNameById() : this.clientNameById();
    return this.parseIds(row.clientIDs)
      .map((id) => map.get(id) ?? String(id))
      .join(', ');
  }

  protected typeLabel(source: string | null): string {
    return this.typeOptions.find((o) => o.value === source)?.label ?? (source || '—');
  }

  private parseIds(csv: string | null | undefined): number[] {
    return (csv ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
  }

  // ---- Recipient checkbox handlers ------------------------------------------
  protected isSelected(id: number): boolean {
    return this.selected().has(id);
  }
  protected toggleRecipient(id: number, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  protected toggleAllFiltered(checked: boolean): void {
    const ids = this.filteredRecipients().map((r) => r.id);
    this.selected.update((set) => {
      const next = new Set(set);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
  protected setRecipientMode(mode: 'client' | 'group'): void {
    if (this.recipientMode() === mode) return;
    this.recipientMode.set(mode);
    this.selected.set(new Set());
    this.recipientFilter.set('');
  }

  /** Reads the picked image into a data-URL (uploaded on send) + keeps its name for display. */
  protected onFile(control: 'fileHeader' | 'fileFooter', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const data = control === 'fileHeader' ? this.fileHeaderData : this.fileFooterData;

    if (!file) {
      this.form.controls[control].setValue('');
      data.set(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notify.error('Please choose an image file.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notify.error('The image must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      data.set(typeof reader.result === 'string' ? reader.result : null);
      this.form.controls[control].setValue(file.name);
    };
    reader.readAsDataURL(file);
  }

  /** Clears an attached file without opening the picker (stops the label activating it). */
  protected clearFile(control: 'fileHeader' | 'fileFooter', input: HTMLInputElement, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    input.value = '';
    this.form.controls[control].setValue('');
    (control === 'fileHeader' ? this.fileHeaderData : this.fileFooterData).set(null);
  }

  // ---- Form show/hide -------------------------------------------------------
  protected startAdd(): void {
    this.form.reset({
      sourceName: null,
      subject: '',
      siteName: '',
      buySell: '',
      currency: '',
      expiry: '',
      entryPrice: '',
      targetPrice: '',
      stopClose: '',
      fileHeader: '',
      fileFooter: '',
    });
    this.type.set(null);
    this.fileHeaderData.set(null);
    this.fileFooterData.set(null);
    this.recipientMode.set('group');
    this.selected.set(new Set());
    this.recipientFilter.set('');
    this.adding.set(true);
  }
  protected cancelAdd(): void {
    this.adding.set(false);
  }

  // ---- Trading-call edit (close) --------------------------------------------
  protected startEdit(row: BroadcastMessage): void {
    this.editForm.reset({
      status: row.status || 'Active',
      exitType: row.exitType || null,
      exitRate: row.exitRate != null ? String(row.exitRate) : '',
    });
    this.editRow.set(row);
  }

  protected cancelEdit(): void {
    this.editRow.set(null);
  }

  protected updateCall(): void {
    const row = this.editRow();
    if (!row || this.updating()) return;
    const v = this.editForm.getRawValue();

    const payload: UpdateBroadcastMessage = {
      recordId: row.id,
      status: v.status,
      exitType: v.exitType,
      exitRate: this.num(v.exitRate),
      subject: row.subject,
    };

    this.updating.set(true);
    this.service
      .update(payload)
      .pipe(finalize(() => this.updating.set(false)))
      .subscribe(() => {
        this.notify.success('Trading call updated.');
        this.editRow.set(null);
        this.load();
      });
  }

  // ---- Details (view a broadcast + its header/footer images) ----------------
  protected openDetails(row: BroadcastMessage): void {
    this.detailsRow.set(row);
    this.setDetailsUrl('header', null);
    this.setDetailsUrl('footer', null);
    this.loadDetailsImage('header', row.fileHeader);
    this.loadDetailsImage('footer', row.fileFooter);
  }

  protected closeDetails(): void {
    this.setDetailsUrl('header', null);
    this.setDetailsUrl('footer', null);
    this.detailsRow.set(null);
  }

  /** Fetches a stored header/footer image (blob) into an object URL for the details view. */
  private loadDetailsImage(which: 'header' | 'footer', path: string | null): void {
    if (!path) return;
    this.service.fileBlob(path).subscribe({
      next: (blob) =>
        this.setDetailsUrl(which, blob && blob.size > 0 ? URL.createObjectURL(blob) : null),
      error: () => this.setDetailsUrl(which, null),
    });
  }

  /** Swaps a details image object URL, revoking the previous one to avoid leaks. */
  private setDetailsUrl(which: 'header' | 'footer', url: string | null): void {
    const sig = which === 'header' ? this.detailsHeaderUrl : this.detailsFooterUrl;
    const prev = sig();
    if (prev) URL.revokeObjectURL(prev);
    sig.set(url);
  }

  // ---- Send -----------------------------------------------------------------
  protected send(): void {
    if (this.sending()) return;
    const v = this.form.getRawValue();
    const type = v.sourceName as BroadcastType | null;

    if (!type) {
      this.notify.error('Select a message type.');
      return;
    }
    if (this.selected().size === 0) {
      this.notify.error('Select at least one recipient.');
      return;
    }

    let subject = (v.subject ?? '').trim();
    if (type === 'TradingCalls') {
      if (!v.buySell || !v.currency.trim()) {
        this.notify.error('Buy/Sell and Currency / Commodity are required for a trading call.');
        return;
      }
      subject = [
        'Intraday Call :',
        v.buySell,
        v.currency.trim(),
        v.expiry.trim() ? `${v.expiry.trim()} expiry` : '',
        v.entryPrice.trim() ? `at ${v.entryPrice.trim()}` : '',
        v.stopClose.trim() ? `with SL at ${v.stopClose.trim()}` : '',
        v.targetPrice.trim() ? `target ${v.targetPrice.trim()}` : '',
      ]
        .filter((p) => p)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else if (!subject) {
      this.notify.error('Notification header is required.');
      return;
    }

    const payload: SaveBroadcastMessage = {
      sourceName: type,
      isGroup: this.recipientMode() === 'group' ? '1' : '0',
      clientIDs: [...this.selected()].join(','),
      subject,
      text: type === 'TradingCalls' ? null : (v.siteName ?? '').trim() || null,
      siteName: null,
      buySell: type === 'TradingCalls' ? v.buySell || null : null,
      currency: type === 'TradingCalls' ? v.currency.trim() || null : null,
      expiry: type === 'TradingCalls' ? v.expiry.trim() || null : null,
      entryPrice: type === 'TradingCalls' ? this.num(v.entryPrice) : null,
      targetPrice: type === 'TradingCalls' ? this.num(v.targetPrice) : null,
      stopClose: type === 'TradingCalls' ? this.num(v.stopClose) : null,
      // Header/Footer images are only offered for Normal broadcasts; the server writes
      // the bytes to disk and stores the resulting path in fileHeader/fileFooter.
      fileHeader: null,
      fileFooter: null,
      fileHeaderBase64: type === 'Normal' ? this.fileHeaderData() : null,
      fileHeaderName: type === 'Normal' ? (v.fileHeader || null) : null,
      fileFooterBase64: type === 'Normal' ? this.fileFooterData() : null,
      fileFooterName: type === 'Normal' ? (v.fileFooter || null) : null,
    };

    this.sending.set(true);
    this.service
      .send(payload)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe(() => {
        this.notify.success('Broadcast message sent.');
        this.adding.set(false);
        this.load();
      });
  }

  private num(value: string): number | null {
    const t = (value ?? '').trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isNaN(n) ? null : n;
  }

  // ---- List paging / filtering ----------------------------------------------
  protected setListFilter(value: string): void {
    this.listFilter.set(value);
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
