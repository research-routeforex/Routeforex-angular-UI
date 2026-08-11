import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { RateAlert } from './rate-alert.model';
import { RateAlertService } from './rate-alert.service';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

/**
 * Rate Alert (FTP Transactions) — new-app version of the legacy screen. Create
 * a rate alert (currency pair + above/below threshold + rate + validity + how to
 * be alerted) and browse existing alerts. "Alert Me" Email + Phone both ticked
 * stores AlertMeOn = 'Both'. Backed by usp_RF_RateAlert_* (TFTPO_Txn_RateAlert).
 */
@Component({
  selector: 'app-rate-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  templateUrl: './rate-alert.html',
  styleUrl: './rate-alert.scss',
})
export class RateAlertComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(RateAlertService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<RateAlert[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that RecordID. */
  protected readonly editingId = signal(0);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly currencyOptions = signal<SelectOption[]>([]);
  protected readonly validityOptions = signal<SelectOption[]>([]);

  /** Selected currency (drives the Alert-Me-When options). */
  private readonly currency = signal<string | null>(null);
  /** "<pair> is Equal to or Above/Below Than" — derived from the chosen currency. */
  protected readonly alertMeWhenOptions = computed<SelectOption[]>(() => {
    const ccy = this.currency();
    if (!ccy) return [];
    return [
      { value: `${ccy} is Equal to or Above Than`, label: `${ccy} is Equal to or Above Than` },
      { value: `${ccy} is Equal to or Below Than`, label: `${ccy} is Equal to or Below Than` },
    ];
  });

  // List filters
  protected readonly filterText = signal('');
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    currency: this.fb.control<string | null>(null, [Validators.required]),
    alertMeWhen: this.fb.control<string | null>(null, [Validators.required]),
    rate: this.fb.control<number | null>(null, [Validators.required]),
    validityOfAlert: this.fb.control<number | null>(null, [Validators.required]),
    alertEmail: [false],
    alertPhone: [false],
    status: this.fb.control<string | null>('Active'),
  });

  ngOnInit(): void {
    this.service.getCurrencyOptions().subscribe((o) => this.currencyOptions.set(o));
    this.service.getValidityOptions().subscribe((o) => this.validityOptions.set(o));

    // When the currency changes, refresh the Alert-Me-When options and clear the pick.
    this.form.controls.currency.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.currency.set(v);
        this.form.controls.alertMeWhen.setValue(null);
      });

    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterText() || null, this.filterStatus())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterText(value: string): void {
    this.filterText.set(value);
  }
  protected onFilterStatus(value: string | null): void {
    this.filterStatus.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterText.set('');
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

  protected edit(row: RateAlert): void {
    this.editingId.set(row.recordID);
    const on = (row.alertMeOn ?? '').toLowerCase();
    this.form.patchValue({
      rate: row.rate ?? null,
      validityOfAlert: row.validityOfAlert ?? null,
      alertEmail: on === 'both' || on === 'email',
      alertPhone: on === 'both' || on === 'phone',
      status: row.status ?? 'Active',
    });
    // Set currency first (its valueChanges clears alertMeWhen + rebuilds the
    // options), then restore the saved condition so it stays selected.
    this.form.controls.currency.setValue(row.currency ?? null);
    this.form.controls.alertMeWhen.setValue(row.alertMeWhen ?? null);
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      currency: null,
      alertMeWhen: null,
      rate: null,
      validityOfAlert: null,
      alertEmail: false,
      alertPhone: false,
      status: 'Active',
    });
    this.currency.set(null);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
  }

  /** Email + Phone => 'Both'; one => that one; none => null. */
  private alertMeOn(email: boolean, phone: boolean): string | null {
    if (email && phone) return 'Both';
    if (email) return 'Email';
    if (phone) return 'Phone';
    return null;
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const alertMeOn = this.alertMeOn(v.alertEmail, v.alertPhone);
    if (!alertMeOn) {
      this.notify.error('Select at least one alert channel (Email and/or Phone).');
      return;
    }
    this.saving.set(true);
    const editing = this.editingId() > 0;
    this.service
      .save({
        recordID: this.editingId(),
        currency: v.currency!,
        alertMeWhen: v.alertMeWhen,
        rate: v.rate,
        validityOfAlert: v.validityOfAlert,
        alertMeOn,
        status: v.status,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Rate alert updated.' : 'Rate alert added.');
        this.closeForm();
        this.load();
      });
  }
}
