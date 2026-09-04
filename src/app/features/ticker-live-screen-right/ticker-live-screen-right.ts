import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { DateFieldComponent } from '../../shared/components/date-field/date-field';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import { TickerLiveScreenRow } from './ticker-live-screen-right.model';
import { TickerLiveScreenRightService } from './ticker-live-screen-right.service';

@Component({
  selector: 'app-ticker-live-screen-right',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    DateFieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './ticker-live-screen-right.html',
  styleUrl: './ticker-live-screen-right.scss',
})
export class TickerLiveScreenRightComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TickerLiveScreenRightService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<TickerLiveScreenRow[]>([]);

  /** Client options ({ value: id, label: name }) from the common dropdown proc. */
  protected readonly clientOptions = signal<SelectOption[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** List search filters (server-side, via usp_RF_TickerLiveScreen_Search). */
  protected readonly searchClient = signal('');
  protected readonly searchFrom = signal('');
  protected readonly searchTo = signal('');

  /** null = form hidden; 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    id: [0],
    clientID: [null as number | null, [Validators.required]],
    amount: [null as number | null],
    validityFrom: ['', [Validators.required]],
    validityTo: ['', [Validators.required]],
  });

  protected readonly total = computed(() => this.allRows().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<TickerLiveScreenRow[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.allRows().slice(start, start + this.pageSize());
  });
  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const client = this.searchClient().trim();
    this.service
      .search(client === '' ? null : Number(client), this.searchFrom() || null, this.searchTo() || null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  protected setSearchClient(value: string | number): void {
    this.searchClient.set(value == null ? '' : String(value));
    this.pageNumber.set(1);
    this.load();
  }

  protected setSearchFrom(value: string): void {
    this.searchFrom.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  protected setSearchTo(value: string): void {
    this.searchTo.set(value);
    this.pageNumber.set(1);
    this.load();
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

  protected startAdd(): void {
    this.form.reset({ id: 0, clientID: null, amount: null, validityFrom: '', validityTo: '' });
    this.editingId.set(0);
  }

  protected startEdit(row: TickerLiveScreenRow): void {
    this.form.reset({
      id: row.id,
      clientID: row.clientID,
      amount: row.amount,
      // app-date-field expects a yyyy-MM-dd value.
      validityFrom: (row.validityFrom ?? '').slice(0, 10),
      validityTo: (row.validityTo ?? '').slice(0, 10),
    });
    this.editingId.set(row.id);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .save({
        id: v.id,
        clientID: Number(v.clientID),
        amount: v.amount == null || (v.amount as unknown) === '' ? null : Number(v.amount),
        validityFrom: v.validityFrom,
        validityTo: v.validityTo,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Ticker live screen subscription saved.');
        this.editingId.set(null);
        this.load();
      });
  }
}
