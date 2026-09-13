import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../shared/date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../shared/directives/open-datepicker-on-focus.directive';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DropdownService } from '../../shared/services/dropdown.service';
import { OtherService } from './other-services.model';
import { OtherServicesService } from './other-services.service';

/** Format a Date as local yyyy-MM-dd (avoids the UTC shift of toISOString). */
function toYmd(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Other Services (Masters) — new-app version of the legacy "Other Service
 * Payment" screen. On load it lists every entry; the Client + Date filters
 * narrow the list. "Add New Other Service" opens the form (Service, Client,
 * Amount, Date). Rewrites the legacy Proc_TPO_Mast_OtherServices behaviour.
 */
@Component({
  selector: 'app-other-services',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatDatepickerModule,
    OpenDatepickerOnFocusDirective,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  // dd-MMM-yyyy datepicker, scoped to this screen (same as FTP Order Entry).
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './other-services.html',
  styleUrl: './other-services.scss',
})
export class OtherServicesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(OtherServicesService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly rows = signal<OtherService[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal(0);

  // Dropdown options
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly serviceOptions = signal<SelectOption[]>([]);

  // List filters
  protected readonly filterClientId = signal<number | null>(null);
  protected readonly filterDate = signal<Date | null>(null);

  protected readonly total = computed(() => this.rows().length);

  protected readonly form = this.fb.nonNullable.group({
    productId: this.fb.control<number | null>(null, [Validators.required]),
    clientId: this.fb.control<number | null>(null, [Validators.required]),
    amount: this.fb.control<number | null>(null),
    transactionDate: this.fb.control<Date | null>(null),
    toDate: this.fb.control<Date | null>(null),
  });

  /** Currently selected service in the form (drives the Advisory date fields). */
  private readonly selectedProductId = signal<number | null>(null);

  /**
   * True when the picked service is "Advisory" — the single Date field then
   * becomes "From Date" (→ TransactionDate) and a "To Date" (→ Todate) shows.
   */
  protected readonly isAdvisory = computed(() => {
    const id = this.selectedProductId();
    if (id == null) return false;
    const opt = this.serviceOptions().find((o) => o.value === id);
    return (opt?.label ?? '').trim().toLowerCase() === 'advisory';
  });

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
    this.service.getServiceOptions().subscribe((o) => this.serviceOptions.set(o));
    this.form.controls.productId.valueChanges.subscribe((v) => this.selectedProductId.set(v));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterClientId(), toYmd(this.filterDate()))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterClient(clientId: number | null): void {
    this.filterClientId.set(clientId);
  }
  protected onFilterDate(value: Date | null): void {
    this.filterDate.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterClientId.set(null);
    this.filterDate.set(null);
    this.load();
  }

  /** True when a grid row is an Advisory service (drives the date range). */
  protected isAdvisoryRow(r: OtherService): boolean {
    return (r.productName ?? '').trim().toLowerCase() === 'advisory' && !!r.toDate;
  }

  /** Date cell for the CSV — a range ("from To to") for Advisory rows. */
  private formatDateCell(r: OtherService): string {
    const from = r.transactionDate ? r.transactionDate.slice(0, 10) : '';
    return this.isAdvisoryRow(r) ? `${from} To ${r.toDate!.slice(0, 10)}` : from;
  }

  /** Download the current list as a CSV file. */
  protected export(): void {
    const header = ['S.No', 'Product', 'Client', 'Date', 'Amount'];
    const lines = this.rows().map((r, i) =>
      [
        i + 1,
        r.productName ?? '',
        r.clientName ?? '',
        this.formatDateCell(r),
        r.amount ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `other-services-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Form open / edit / close --------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.form.reset();
      this.showForm.set(true);
    }
  }

  protected edit(r: OtherService): void {
    this.editingId.set(r.otherServiceId);
    this.form.reset();
    this.form.patchValue({
      productId: r.productId ?? null,
      clientId: r.clientId ?? null,
      amount: r.amount ?? null,
      transactionDate: r.transactionDate ? new Date(r.transactionDate) : null,
      toDate: r.toDate ? new Date(r.toDate) : null,
    });
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.form.reset();
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const editing = this.editingId() > 0;
    this.service
      .save({
        otherServiceId: this.editingId(),
        productId: v.productId!,
        clientId: v.clientId!,
        amount: v.amount,
        transactionDate: toYmd(v.transactionDate),
        // "To Date" only applies to Advisory; otherwise it is not captured.
        toDate: this.isAdvisory() ? toYmd(v.toDate) : null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Other service updated.' : 'Other service added.');
        this.closeForm();
        this.load();
      });
  }

  protected remove(r: OtherService): void {
    this.confirm
      .confirm({
        title: 'Remove entry?',
        message: `Remove ${r.productName || 'this entry'} for ${r.clientName || 'the client'}?`,
        confirmText: 'Remove',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.delete(r.otherServiceId).subscribe(() => {
          this.notify.success('Other service removed.');
          this.load();
        });
      });
  }
}
