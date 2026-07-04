import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { CountryRegion } from '../common-master.model';
import { CommonMasterService } from '../common-master.service';

interface ColumnFilters {
  regionCode: string;
  regionDescription: string;
  activeStatus: string;
}

@Component({
  selector: 'app-country-region',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './country-region.html',
  styleUrl: './country-region.scss',
})
export class CountryRegionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<CountryRegion[]>([]);

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
    countryRegionID: [0],
    regionCode: ['', [Validators.required, Validators.maxLength(50)]],
    regionDescription: ['', [Validators.required, Validators.maxLength(200)]],
    activeStatus: ['Active'],
  });

  protected readonly filters = signal<ColumnFilters>({
    regionCode: '',
    regionDescription: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<CountryRegion[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.regionCode, f.regionCode) &&
        has(r.regionDescription, f.regionDescription) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<CountryRegion[]>(() => {
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
      .getCountryRegions()
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
    this.form.reset({ countryRegionID: 0, regionCode: '', regionDescription: '', activeStatus: 'Active' });
    this.editingId.set(0);
  }

  protected startEdit(row: CountryRegion): void {
    this.form.reset({
      countryRegionID: row.countryRegionID,
      regionCode: row.regionCode,
      regionDescription: row.regionDescription,
      activeStatus: row.activeStatus || 'Active',
    });
    this.editingId.set(row.countryRegionID);
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
      .saveCountryRegion(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Country region saved.');
        this.editingId.set(null);
        this.load();
      });
  }

  protected remove(row: CountryRegion): void {
    this.confirm
      .confirm({
        title: 'Delete region?',
        message: `Remove "${row.regionDescription}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteCountryRegion(row.countryRegionID).subscribe(() => {
          this.notify.success('Country region deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
