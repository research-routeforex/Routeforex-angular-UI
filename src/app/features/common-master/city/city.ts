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
import { CityMaster } from '../common-master.model';
import { CommonMasterService } from '../common-master.service';

interface ColumnFilters {
  cityCode: string;
  cityName: string;
  countryCode: string;
  regionCode: string;
  activeStatus: string;
}

@Component({
  selector: 'app-city',
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
  templateUrl: './city.html',
  styleUrl: './city.scss',
})
export class CityComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CommonMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly allRows = signal<CityMaster[]>([]);
  protected readonly countryOptions = signal<SelectOption[]>([]);
  protected readonly regionOptions = signal<SelectOption[]>([]);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];
  protected readonly editingId = signal<number | null>(null);

  protected readonly statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    cityID: [0],
    cityCode: ['', [Validators.required, Validators.maxLength(50)]],
    cityName: ['', [Validators.required, Validators.maxLength(50)]],
    countryCode: this.fb.control<string | null>(null, [Validators.required]),
    regionCode: this.fb.control<string | null>(null),
    activeStatus: ['Active'],
  });

  protected readonly filters = signal<ColumnFilters>({
    cityCode: '',
    cityName: '',
    countryCode: '',
    regionCode: '',
    activeStatus: '',
  });

  protected readonly filtered = computed<CityMaster[]>(() => {
    const f = this.filters();
    return this.allRows().filter(
      (r) =>
        has(r.cityCode, f.cityCode) &&
        has(r.cityName, f.cityName) &&
        has(this.countryLabel(r.countryCode), f.countryCode) &&
        has(this.regionLabel(r.regionCode), f.regionCode) &&
        has(r.activeStatus, f.activeStatus),
    );
  });

  protected readonly total = computed(() => this.filtered().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<CityMaster[]>(() => {
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
    this.service.getCountries().subscribe((countries) =>
      this.countryOptions.set(
        countries.map((c) => ({ value: c.countryCode, label: c.countryDescription || c.countryCode })),
      ),
    );
    this.service.getCountryRegions().subscribe((regions) =>
      this.regionOptions.set(
        regions.map((r) => ({ value: r.regionCode, label: r.regionDescription || r.regionCode })),
      ),
    );
    this.load();
  }

  protected countryLabel(code: string | null): string {
    if (!code) return '';
    return this.countryOptions().find((o) => o.value === code)?.label ?? code;
  }
  protected regionLabel(code: string | null): string {
    if (!code) return '';
    return this.regionOptions().find((o) => o.value === code)?.label ?? code;
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getCities()
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
    this.form.reset({
      cityID: 0,
      cityCode: '',
      cityName: '',
      countryCode: null,
      regionCode: null,
      activeStatus: 'Active',
    });
    this.editingId.set(0);
  }

  protected startEdit(row: CityMaster): void {
    this.form.reset({
      cityID: row.cityID,
      cityCode: row.cityCode,
      cityName: row.cityName,
      countryCode: row.countryCode,
      regionCode: row.regionCode,
      activeStatus: row.activeStatus || 'Active',
    });
    this.editingId.set(row.cityID);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .saveCity({
        cityID: v.cityID,
        cityCode: v.cityCode,
        cityName: v.cityName,
        countryCode: v.countryCode ?? '',
        regionCode: v.regionCode ?? '',
        zone: null,
        activeStatus: v.activeStatus,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('City saved.');
        this.editingId.set(null);
        this.load();
      });
  }

  protected remove(row: CityMaster): void {
    this.confirm
      .confirm({
        title: 'Delete city?',
        message: `Remove "${row.cityName}"?`,
        confirmText: 'Delete',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteCity(row.cityID).subscribe(() => {
          this.notify.success('City deleted.');
          this.load();
        });
      });
  }
}

function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
