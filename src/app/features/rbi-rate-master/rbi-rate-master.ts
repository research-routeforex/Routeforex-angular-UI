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
import { RbiRate } from './rbi-rate-master.model';
import { RbiRateMasterService } from './rbi-rate-master.service';

@Component({
  selector: 'app-rbi-rate-master',
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
  templateUrl: './rbi-rate-master.html',
  styleUrl: './rbi-rate-master.scss',
})
export class RbiRateMasterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RbiRateMasterService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<RbiRate[]>([]);

  /** Currency options ({ value: code, label: name }) from the common dropdown proc. */
  protected readonly currencyOptions = signal<SelectOption[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** List search filters (server-side, via usp_RF_RBIRate_Search). */
  protected readonly searchDate = signal('');
  protected readonly searchCurrency = signal('');
  protected readonly searchRate = signal('');

  /** null = form hidden; 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    recordID: [0],
    date: ['', [Validators.required]],
    currency: ['', [Validators.required]],
    rbiRate: [null as number | null, [Validators.required]],
    customRate: [null as number | null, [Validators.required]],
  });

  protected readonly total = computed(() => this.allRows().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<RbiRate[]>(() => {
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
    this.dropdowns.get('CurrencyTF').subscribe((opts) => this.currencyOptions.set(opts));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const rate = this.searchRate().trim();
    this.service
      .search(
        this.searchDate() || null,
        this.searchCurrency().trim() || null,
        rate === '' ? null : Number(rate),
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  protected setSearchDate(value: string): void {
    this.searchDate.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  protected setSearchCurrency(value: string): void {
    this.searchCurrency.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  protected setSearchRate(value: string): void {
    this.searchRate.set(value);
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
    this.form.reset({ recordID: 0, date: '', currency: '', rbiRate: null, customRate: null });
    this.editingId.set(0);
  }

  protected startEdit(row: RbiRate): void {
    this.form.reset({
      recordID: row.recordID,
      // app-date-field expects a yyyy-MM-dd value.
      date: (row.date ?? '').slice(0, 10),
      currency: row.currency,
      rbiRate: row.rbiRate,
      customRate: row.customRate,
    });
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
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.service
      .save({
        recordID: v.recordID,
        date: v.date,
        currency: v.currency,
        rbiRate: Number(v.rbiRate),
        customRate: Number(v.customRate),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('RBI rate saved.');
        this.editingId.set(null);
        this.load();
      });
  }
}
