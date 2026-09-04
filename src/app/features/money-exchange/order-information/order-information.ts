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
import { NotificationService } from '../../../core/services/notification.service';
import { DateFieldComponent } from '../../../shared/components/date-field/date-field';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { MeOrder } from './order-information.model';
import { OrderInformationService } from './order-information.service';

const ORDER_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

const CURRENCY_CARD_OPTIONS: SelectOption[] = [
  { value: 'Currency Notes', label: 'Currency Notes' },
  { value: 'Forex Card', label: 'Forex Card' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Done', label: 'Done' },
  { value: 'Not Done', label: 'Not Done' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

/**
 * Money Exchange — Order Information. New-app version of the legacy screen. Add
 * + edit a money-exchange order; the client is resolved server-side from the
 * entered contact number. Currency options come from the common
 * USP_RF_BINDDROPDOWN (@type='Currency'); the selected pair text is stored.
 * Backed by usp_RF_MCOrder_* (MoneyChanging__OrderInformation).
 */
@Component({
  selector: 'app-order-information',
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
    DecimalPipe,
  ],
  templateUrl: './order-information.html',
  styleUrl: './order-information.scss',
})
export class OrderInformationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(OrderInformationService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<MeOrder[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** 0 = adding; >0 = editing that RecordID. */
  protected readonly editingId = signal(0);
  /** true = read-only view (all fields disabled, no submit). */
  protected readonly viewing = signal(false);

  protected readonly orderTypeOptions = ORDER_TYPE_OPTIONS;
  protected readonly currencyCardOptions = CURRENCY_CARD_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly currencyOptions = signal<SelectOption[]>([]);

  // List filters
  protected readonly filterText = signal('');
  protected readonly filterStatus = signal<string | null>(null);

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    contactNumber: this.fb.control<string | null>(null, [Validators.required]),
    bookingDate: this.fb.control<string | null>(null),
    orderType: this.fb.control<string | null>(null, [Validators.required]),
    currencyCard: this.fb.control<string | null>(null, [Validators.required]),
    currency: this.fb.control<string | null>(null, [Validators.required]),
    amount: this.fb.control<number | null>(null, [Validators.required]),
    query: this.fb.control<string | null>(null),
    remarks: this.fb.control<string | null>(null),
    status: this.fb.control<string | null>('Active'),
  });

  ngOnInit(): void {
    // Currency dropdown = the common BINDDROPDOWN(@type='Currency'). Store the
    // displayed pair text (label) so the list matches the legacy Currency column.
    this.dropdowns.get('Currency').subscribe((opts) =>
      this.currencyOptions.set(opts.map((o) => ({ value: o.label, label: o.label }))),
    );
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

  protected edit(row: MeOrder): void {
    this.viewing.set(false);
    this.editingId.set(row.recordID);
    this.form.enable({ emitEvent: false });
    this.patchFromRow(row);
    this.showForm.set(true);
  }

  /** Read-only view — same form pre-filled, all fields disabled, no submit. */
  protected view(row: MeOrder): void {
    this.viewing.set(true);
    this.editingId.set(row.recordID);
    this.patchFromRow(row);
    this.form.disable({ emitEvent: false });
    this.showForm.set(true);
  }

  private patchFromRow(row: MeOrder): void {
    this.form.reset({
      contactNumber: row.contactNumber ?? null,
      bookingDate: this.toDateInput(row.bookingDate),
      orderType: row.orderType ?? null,
      currencyCard: row.currencyCard ?? null,
      currency: row.currency ?? null,
      amount: row.amount ?? null,
      query: row.query ?? null,
      remarks: row.remarks ?? null,
      status: row.status ?? 'Active',
    });
  }

  private resetForm(): void {
    this.viewing.set(false);
    this.form.enable({ emitEvent: false });
    this.form.reset({
      contactNumber: null,
      bookingDate: null,
      orderType: null,
      currencyCard: null,
      currency: null,
      amount: null,
      query: null,
      remarks: null,
      status: 'Active',
    });
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.resetForm();
  }

  protected save(): void {
    if (this.viewing()) return;
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
        contactNumber: v.contactNumber!,
        bookingDate: v.bookingDate,
        orderType: v.orderType,
        currencyCard: v.currencyCard,
        currency: v.currency,
        amount: v.amount,
        query: v.query,
        remarks: v.remarks,
        status: v.status,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Order updated.' : 'Order added.');
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
