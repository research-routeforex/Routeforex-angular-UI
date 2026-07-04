import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { FieldComponent } from '../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Currency } from './currency-master.model';
import { CurrencyMasterService } from './currency-master.service';

interface ColumnFilters {
  currencyName: string;
  currencyCode: string;
  activeStatus: string;
}

@Component({
  selector: 'app-currency-master',
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
  templateUrl: './currency-master.html',
  styleUrl: './currency-master.scss',
})
export class CurrencyMasterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CurrencyMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<Currency[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** null = form hidden; 0 = adding; >0 = editing that id. */
  protected readonly editingId = signal<number | null>(null);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    currencyID: [0],
    currencyName: ['', [Validators.required, Validators.maxLength(100)]],
    activeStatus: ['Active'],
  });

  protected readonly filters = signal<ColumnFilters>({
    currencyName: '',
    currencyCode: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<Currency[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.currencyName, f.currencyName) &&
        has(r.currencyCode, f.currencyCode) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<Currency[]>(() => {
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
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getCurrencies()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  protected setFilter(key: keyof ColumnFilters, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
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

  protected startAdd(): void {
    this.form.reset({ currencyID: 0, currencyName: '', activeStatus: 'Active' });
    this.editingId.set(0);
  }

  protected startEdit(row: Currency): void {
    this.form.reset({
      currencyID: row.currencyID,
      currencyName: row.currencyName,
      activeStatus: row.activeStatus || 'Active',
    });
    this.editingId.set(row.currencyID);
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
    this.service
      .saveCurrency(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Currency saved.');
        this.editingId.set(null);
        this.load();
      });
  }

  protected remove(row: Currency): void {
    this.confirm
      .confirm({
        title: 'Delete currency?',
        message: `Remove "${row.currencyName}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteCurrency(row.currencyID).subscribe(() => {
          this.notify.success('Currency deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
