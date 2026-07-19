import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../../shared/date/dmy-date-adapter';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { ExecutiveDealDetail, ExecutiveDealRequest, Section } from '../executive-dashboard.models';
import { ExecutiveDashboardService } from '../executive-dashboard.service';

/** How the form is being used: capture, edit, or read-only view. */
type FormMode = 'new' | 'edit' | 'view';

/**
 * New Executive Dashboard deal (Import / Export). Type drives which fields show —
 * shared columns surface under different labels per type (e.g. the BL date column
 * is "BL / Bill of Entry" for Import, "Shipping Date" for Export).
 */
@Component({
  selector: 'app-executive-deal-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
  ],
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './executive-deal-form.html',
  styleUrl: './executive-deal-form.scss',
})
export class ExecutiveDealFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly svc = inject(ExecutiveDashboardService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  /** Form usage: 'new' (default), 'edit', or read-only 'view'. */
  protected readonly mode = signal<FormMode>('new');
  protected readonly isView = computed(() => this.mode() === 'view');
  protected readonly isEdit = computed(() => this.mode() === 'edit');
  /** Existing deal id when editing / viewing. */
  private readonly recordId = signal<number | null>(null);

  protected readonly pageTitle = computed(() =>
    this.mode() === 'edit' ? 'Edit Deal' : this.mode() === 'view' ? 'View Deal' : 'Add New Deal',
  );
  protected readonly pageSubtitle = computed(() =>
    this.mode() === 'view'
      ? 'Deal details for the Executive Dashboard (read-only).'
      : 'Capture an Import / Export deal for the Executive Dashboard.',
  );

  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly bankOptions = signal<SelectOption[]>([]);
  protected readonly currencyOptions = signal<SelectOption[]>([]);

  protected readonly typeOptions: SelectOption[] = [
    { value: 'Import', label: 'Import' },
    { value: 'Export', label: 'Export' },
  ];
  protected readonly statusOptions: SelectOption[] = [
    { value: 1, label: 'Active' },
    { value: 0, label: 'Inactive' },
  ];
  // Import BC / Usance LC — adjust to your master list if needed.
  protected readonly usanceLcOptions: SelectOption[] = [
    { value: 'Sight LC', label: 'Sight LC' },
    { value: 'Usance LC', label: 'Usance LC' },
    { value: 'BC', label: 'BC' },
  ];
  // Import "Sight / Usance".
  protected readonly sightUsanceOptions: SelectOption[] = [
    { value: 'Sight', label: 'Sight' },
    { value: 'Usance', label: 'Usance' },
  ];
  // Export financing type.
  protected readonly financingOptions: SelectOption[] = [
    { value: 'PCFC', label: 'PCFC' },
    { value: 'EPC', label: 'EPC' },
    { value: 'EBRD', label: 'EBRD' },
    { value: 'Bill discounting', label: 'Bill discounting' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    client: this.fb.control<number | null>(null, [Validators.required]),
    type: this.fb.nonNullable.control<Section>('Import', [Validators.required]),
    bankName: this.fb.control<number | null>(null),
    bankLcNo: this.fb.control<string | null>(null),
    bankLcDate: this.fb.control<Date | null>(null),
    // Import: Sight/Usance; Export: EBRD/EPC/PCFC/Bill dis (both persist to BC_Rollover).
    bcRollover: this.fb.control<string | null>(null),
    bcUsanceLc: this.fb.control<string | null>(null),
    interstRate: this.fb.control<number | null>(null),
    buyersCreditTakenDate: this.fb.control<Date | null>(null),
    partyName: this.fb.control<string | null>(null),
    dueDate: this.fb.control<Date | null>(null),
    currencyFrom: this.fb.control<string | null>(null, [Validators.required]),
    invoiceAmount: this.fb.control<number | null>(null),
    interestBuyersCredit: this.fb.control<number | null>(null),
    bankSwiftCharges: this.fb.control<number | null>(null),
    totalAmountDue: this.fb.control<number | null>(null),
    forwardContractAmount: this.fb.control<number | null>(null),
    forwardContractRateBooked: this.fb.control<number | null>(null),
    forwardContractBookingDate: this.fb.control<Date | null>(null),
    forwardContractBookingNo: this.fb.control<string | null>(null),
    drawDownAmount: this.fb.control<number | null>(null),
    drawDownRate: this.fb.control<number | null>(null),
    subvention: this.fb.control<number | null>(null),
    remarks: this.fb.control<string | null>(null),
    status: this.fb.control<number>(1),
    rbiReferenceRate: this.fb.control<number | null>(null),
  });

  private readonly typeValue = signal<Section>('Import');
  protected readonly isImport = computed(() => this.typeValue() === 'Import');

  // Labels that differ between Import and Export for shared columns.
  protected readonly lcNoLabel = computed(() =>
    this.isImport() ? 'Bank LC No / Ref Number' : 'Sales Invoice Number',
  );
  protected readonly lcDateLabel = computed(() =>
    this.isImport() ? 'BL / Bill of Entry Date' : 'Shipping Date',
  );
  protected readonly takenDateLabel = computed(() =>
    this.isImport() ? 'Buyers Credit Taken Date' : 'DrawDown Date',
  );
  protected readonly interestLabel = computed(() =>
    this.isImport() ? 'Interest on Buyers Credit' : 'Interest on PCFC / PCL / EBRD / BD',
  );

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
    this.dropdowns.get('Currency').subscribe((o) => this.currencyOptions.set(o));

    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.typeValue.set(v ?? 'Import'));

    // Client → Client Bank cascade.
    this.form.controls.client.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clientId) => {
        this.form.controls.bankName.setValue(null, { emitEvent: false });
        this.bankOptions.set([]);
        if (clientId)
          this.dropdowns.get('ClientBank', clientId).subscribe((o) => this.bankOptions.set(o));
      });

    const mode = (this.route.snapshot.data['mode'] as FormMode) ?? 'new';
    this.mode.set(mode);

    if (mode === 'edit' || mode === 'view') {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.recordId.set(id);
      this.loadDeal(id);
      return;
    }

    // New deal: pre-select client + type when arriving from the dashboard.
    const q = this.route.snapshot.queryParamMap;
    const clientId = q.get('clientId');
    const type = q.get('type');
    if (type === 'Import' || type === 'Export') this.form.controls.type.setValue(type);
    if (clientId) this.form.controls.client.setValue(Number(clientId));
  }

  /** Load an existing deal and pre-fill the form; view mode locks it read-only. */
  private loadDeal(id: number): void {
    this.loading.set(true);
    this.svc
      .getDeal(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.prefill(d),
        error: () => {
          this.notify.error('Could not load the deal.');
          this.router.navigate(['/executive-dashboard']);
        },
      });
  }

  private prefill(d: ExecutiveDealDetail): void {
    this.typeValue.set(d.type);

    // Load this client's banks directly, then select the deal's bank. We patch
    // `client` with emitEvent:false (below) so the client→bank cascade doesn't
    // race this and reset the selection.
    this.dropdowns.get('ClientBank', d.clientID).subscribe((o) => {
      this.bankOptions.set(o);
      this.form.controls.bankName.setValue(d.bankName ?? null, { emitEvent: false });
    });

    this.form.patchValue(
      {
        client: d.clientID,
        type: d.type,
        bankLcNo: d.bankLcNo,
        bankLcDate: toDate(d.bankLcDate),
        bcRollover: d.bcRollover,
        bcUsanceLc: d.bcUsanceLc,
        interstRate: d.interstRate,
        buyersCreditTakenDate: toDate(d.buyersCreditTakenDate),
        partyName: d.partyName,
        dueDate: toDate(d.dueDate),
        currencyFrom: d.currencyFrom,
        invoiceAmount: d.invoiceAmount,
        interestBuyersCredit: d.interestBuyersCredit,
        bankSwiftCharges: d.bankSwiftCharges,
        totalAmountDue: d.totalAmountDue,
        forwardContractAmount: d.forwardContractAmount,
        forwardContractRateBooked: d.forwardContractRateBooked,
        forwardContractBookingDate: toDate(d.forwardContractBookingDate),
        forwardContractBookingNo: d.forwardContractBookingNo,
        drawDownAmount: d.drawDownAmount,
        drawDownRate: d.drawDownRate,
        subvention: d.subvention,
        remarks: d.remarks,
        status: d.status,
        rbiReferenceRate: d.rbiReferenceRate,
      },
      { emitEvent: false },
    );

    if (this.isView()) this.form.disable({ emitEvent: false });
  }

  /** Switch a read-only view into the edit form for the same deal. */
  protected editThis(): void {
    const id = this.recordId();
    if (id != null) this.router.navigate(['/executive-dashboard', id, 'edit']);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fill the required fields.');
      return;
    }
    const v = this.form.getRawValue();
    const imp = this.isImport();
    // The Currency dropdown holds a pair like "USD / INR" — split it so the base
    // currency goes to CurrencyFrom and the settlement currency to CurrencyTo.
    const [currencyFrom, currencyTo] = splitPair(v.currencyFrom);
    const request: ExecutiveDealRequest = {
      recordID: this.recordId(),
      type: v.type,
      clientID: v.client ?? 0,
      bankName: v.bankName ?? null,
      bankLcNo: v.bankLcNo || null,
      bankLcDate: toIso(v.bankLcDate),
      bcRollover: v.bcRollover || null,
      bcUsanceLc: imp ? v.bcUsanceLc || null : null,
      interstRate: num(v.interstRate),
      buyersCreditTakenDate: toIso(v.buyersCreditTakenDate),
      partyName: v.partyName || null,
      dueDate: toIso(v.dueDate),
      currencyFrom,
      currencyTo,
      invoiceAmount: num(v.invoiceAmount),
      interestBuyersCredit: num(v.interestBuyersCredit),
      bankSwiftCharges: imp ? num(v.bankSwiftCharges) : 0,
      totalAmountDue: num(v.totalAmountDue),
      forwardContractAmount: num(v.forwardContractAmount),
      forwardContractRateBooked: num(v.forwardContractRateBooked),
      forwardContractBookingDate: toIso(v.forwardContractBookingDate),
      forwardContractBookingNo: v.forwardContractBookingNo || null,
      rbiReferenceRate: num(v.rbiReferenceRate),
      drawDownAmount: imp ? 0 : num(v.drawDownAmount),
      drawDownRate: imp ? 0 : num(v.drawDownRate),
      subvention: imp ? 0 : num(v.subvention),
      remarks: v.remarks || null,
      status: v.status ?? 1,
    };

    this.saving.set(true);
    this.svc
      .saveDeal(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notify.success(res.message || 'Deal added successfully.');
            this.router.navigate(['/executive-dashboard']);
          } else {
            this.notify.error(res.message || 'Could not add the deal.');
          }
        },
        error: () => this.notify.error('Could not add the deal.'),
      });
  }

  protected clear(): void {
    this.form.reset({ type: 'Import', status: 1 });
    this.bankOptions.set([]);
    this.typeValue.set('Import');
  }

  protected cancel(): void {
    this.router.navigate(['/executive-dashboard']);
  }
}

function num(v: number | null | undefined): number {
  return v == null || Number.isNaN(v) ? 0 : v;
}

/**
 * Splits a currency pair ("USD / INR") into [from, to]. A bare code ("USD")
 * keeps the code as `from` and defaults `to` to INR.
 */
function splitPair(value: string | null | undefined): [string | null, string] {
  const parts = String(value ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  return [parts[0] || null, parts[1] || 'INR'];
}

/** Date → yyyy-MM-dd (unambiguous for the proc's datetime params). */
function toIso(date: Date | null): string | null {
  if (!date) return null;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** ISO 'yyyy-MM-dd' string → local Date (midnight) for the datepicker; null when blank. */
function toDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
