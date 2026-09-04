import { DatePipe, DecimalPipe } from '@angular/common';
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
import { DateFieldComponent } from '../../shared/components/date-field/date-field';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { PromoCode } from './promo-code.model';
import { PromoCodeService } from './promo-code.service';

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

/**
 * Promo Code (Masters) — new-app version of the legacy screen. Add + edit promo
 * codes (code, Buy/Sell type, validity window, amount). Backed by
 * usp_RF_PromoCode_* (CF_MASTER_PROMOCODE).
 */
@Component({
  selector: 'app-promo-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
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
  templateUrl: './promo-code.html',
  styleUrl: './promo-code.scss',
})
export class PromoCodeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PromoCodeService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<PromoCode[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that ID. */
  protected readonly editingId = signal(0);

  protected readonly typeOptions = TYPE_OPTIONS;

  // List filter
  protected readonly filterText = signal('');

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    promoCode: this.fb.control<string | null>(null, [Validators.required]),
    type: this.fb.control<string | null>(null, [Validators.required]),
    validFrom: this.fb.control<string | null>(null, [Validators.required]),
    validTo: this.fb.control<string | null>(null, [Validators.required]),
    amount: this.fb.control<number | null>(null, [Validators.required]),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterText() || null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filter ---------------------------------------------------------------
  protected onFilterText(value: string): void {
    this.filterText.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterText.set('');
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

  protected edit(row: PromoCode): void {
    this.editingId.set(row.id);
    this.form.reset({
      promoCode: row.promoCode ?? null,
      type: row.type ?? null,
      validFrom: this.toDateInput(row.validFrom),
      validTo: this.toDateInput(row.validTo),
      amount: row.amount ?? null,
    });
    this.showForm.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      promoCode: null,
      type: null,
      validFrom: null,
      validTo: null,
      amount: null,
    });
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
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
        id: this.editingId(),
        promoCode: v.promoCode!,
        type: v.type,
        validFrom: v.validFrom,
        validTo: v.validTo,
        amount: v.amount,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Promo code updated.' : 'Promo code added.');
        this.closeForm();
        this.load();
      });
  }

  /** API ISO datetime -> "yyyy-MM-dd" for a date input. */
  private toDateInput(iso: string | null): string | null {
    if (!iso) return null;
    return iso.length >= 10 ? iso.slice(0, 10) : null;
  }
}
