import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { ForexAdvisory } from './forex-advisory.model';
import { ForexAdvisoryService } from './forex-advisory.service';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const TREND_OPTIONS: SelectOption[] = [
  { value: 'UPTREND', label: 'UPTREND' },
  { value: 'DOWNTREND', label: 'DOWNTREND' },
];

/**
 * Forex Advisory (Masters) — new-app version of the legacy screen. Maintains a
 * per-currency advisory band (Range From / Range To), a trend, a note (Message)
 * and an optional uploaded chart image. Add + edit. Backed by
 * usp_RF_ForexAdvisory_* (TPO_ForexAdvisory_ForexAdvisory).
 */
@Component({
  selector: 'app-forex-advisory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  templateUrl: './forex-advisory.html',
  styleUrl: './forex-advisory.scss',
})
export class ForexAdvisoryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ForexAdvisoryService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<ForexAdvisory[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that RecordID. */
  protected readonly editingId = signal(0);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly trendOptions = TREND_OPTIONS;
  protected readonly currencyOptions = signal<SelectOption[]>([]);

  // Picked image (base64 data-URL) for the current add/edit.
  private pickedBase64: string | null = null;
  protected readonly pickedName = signal<string>('');

  // List filters
  protected readonly filterCurrency = signal<string | null>(null);
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    currency: this.fb.control<string | null>(null, [Validators.required]),
    rangeFrom: this.fb.control<number | null>(null, [Validators.required]),
    rangeTo: this.fb.control<number | null>(null, [Validators.required]),
    trend: this.fb.control<string | null>(null, [Validators.required]),
    message: this.fb.control<string | null>(null),
    status: this.fb.control<string | null>('Active'),
  });

  ngOnInit(): void {
    this.service.getCurrencyOptions().subscribe((o) => this.currencyOptions.set(o));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterCurrency(), this.filterStatus())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterCurrency(value: string | null): void {
    this.filterCurrency.set(value);
  }
  protected onFilterStatus(value: string | null): void {
    this.filterStatus.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterCurrency.set(null);
    this.filterStatus.set(null);
    this.load();
  }

  // --- Add / edit form ------------------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.resetForm();
      this.showForm.set(true);
    }
  }

  protected edit(row: ForexAdvisory): void {
    this.editingId.set(row.recordID);
    this.pickedBase64 = null;
    this.pickedName.set(row.fileName ? row.fileName.split('/').pop() ?? '' : '');
    this.form.reset({
      currency: row.currency ?? null,
      rangeFrom: row.rangeFrom ?? null,
      rangeTo: row.rangeTo ?? null,
      trend: row.trend ?? null,
      message: row.message ?? null,
      status: row.status ?? 'Active',
    });
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      currency: null,
      rangeFrom: null,
      rangeTo: null,
      trend: null,
      message: null,
      status: 'Active',
    });
    this.pickedBase64 = null;
    this.pickedName.set('');
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.pickedBase64 = reader.result as string;
      this.pickedName.set(file.name);
    };
    reader.onerror = () => this.notify.error('Could not read the selected file.');
    reader.readAsDataURL(file);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    const editing = this.editingId() > 0;
    this.service
      .save({
        recordID: this.editingId(),
        currency: v.currency!,
        rangeFrom: v.rangeFrom,
        rangeTo: v.rangeTo,
        message: v.message,
        trend: v.trend,
        status: v.status,
        fileName: this.pickedBase64 ? this.pickedName() : null,
        fileBase64: this.pickedBase64,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Forex advisory updated.' : 'Forex advisory added.');
        this.closeForm();
        this.load();
      });
  }
}
