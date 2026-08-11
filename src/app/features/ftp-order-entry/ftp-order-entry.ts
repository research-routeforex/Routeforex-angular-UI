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
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize, merge } from 'rxjs';
import { computeNetRate } from '../../shared/rates/net-rate';
import { orderFieldVisibility } from '../../shared/rates/order-field-visibility';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../shared/date/dmy-date-adapter';
import { ForwardDealPickerComponent } from './forward-deal-picker/forward-deal-picker';
import { FTP_ORDER_CONFIG, ForwardDeal, FtpOrderDetail, OrderScreenConfig } from './ftp-order.model';
import { OrderDocumentsComponent } from './order-documents/order-documents';
import { FtpOrderListComponent } from './ftp-order-list/ftp-order-list';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { OpenDatepickerOnFocusDirective } from '../../shared/directives/open-datepicker-on-focus.directive';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DropdownService } from '../../shared/services/dropdown.service';
import { FtpOrderService } from './ftp-order.service';

@Component({
  selector: 'app-ftp-order-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    DatePipe,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDatepickerModule,
    OpenDatepickerOnFocusDirective,
    OrderDocumentsComponent,
    FtpOrderListComponent,
  ],
  // dd-MMM-yyyy datepicker, scoped to this screen.
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './ftp-order-entry.html',
  styleUrl: './ftp-order-entry.scss',
})
export class FtpOrderEntryComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dropdowns = inject(DropdownService);
  private readonly service = inject(FtpOrderService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Transaction types that consume a parent Forward (open the deal picker). */
  private static readonly TXN_FORWARD_CANCELLATION = 5;
  private static readonly TXN_UTILIZATION = 8;
  /** EEFC Conversion (6), Bill Discount (7), PCFC Disbursement (9) — show the extra pair. */
  private static readonly TXN_CONVERSION_TYPES: readonly number[] = [6, 7, 9];
  /** EEFC Conversion — its Maturity settlement offset follows the Cash/Tom/Spot detail. */
  private static readonly TXN_EEFC_CONVERSION = 6;
  /** Bill Discount — its Window/Fix + date rules follow the Cash/Tom/Spot/Forward detail. */
  private static readonly TXN_BILL_DISCOUNT = 7;
  /**
   * Types whose only date field is Maturity (holiday-checked, no Window/Fix):
   * Cash (1), TOM (2), SPOT (3), EEFC Conversion (6), PCFC Disbursement (9).
   */
  private static readonly TXN_MATURITY_TYPES: readonly number[] = [1, 2, 3, 6, 9];
  /** Types that use the Window/Fix forward date section: Forward (4), Bill Discount (7). */
  private static readonly TXN_FORWARD_TYPES: readonly number[] = [4, 7];

  /** Parent Forward's OrderNumber, stored as RefOrderNumber on save (consuming types). */
  protected readonly refOrderNumber = signal<string | null>(null);
  /** Remaining balance of the picked Forward — caps the Amount field. */
  private readonly balanceLimit = signal<number | null>(null);
  /** Suppresses auto-opening the picker while an existing order loads in edit mode. */
  private suppressPicker = false;
  /** Suppresses the Dealer Net Rate auto-recalc while an existing order loads (keep the saved value). */
  private suppressNetRecalc = false;

  protected readonly saving = signal(false);
  protected readonly recordId = signal(0);
  protected readonly isEdit = computed(() => this.recordId() > 0);

  /** Edit-mode left tab: order form vs the upload-document panel. */
  protected readonly tab = signal<'details' | 'documents'>('details');

  // Dropdown option lists
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly bankOptions = signal<SelectOption[]>([]);
  protected readonly txnOptions = signal<SelectOption[]>([]);
  protected readonly currencyOptions = signal<SelectOption[]>([]);
  protected readonly transactionDetailOptions = signal<SelectOption[]>([]);
  protected readonly currency2Options = signal<SelectOption[]>([]);
  protected readonly impExpOptions: SelectOption[] = [
    { value: 'Import', label: 'Import' },
    { value: 'Export', label: 'Export' },
  ];
  protected readonly whatToDoOptions: SelectOption[] = [
    { value: 'Buy', label: 'Buy' },
    { value: 'Sell', label: 'Sell' },
  ];
  protected readonly windowFixOptions: SelectOption[] = [
    { value: 'Window', label: 'Window' },
    { value: 'Fix', label: 'Fix' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    client: this.fb.control<number | null>(null, [Validators.required]),
    clientBank: this.fb.control<number | null>(null),
    transactionType: this.fb.control<number | null>(null, [Validators.required]),
    // Auto-generated by the server — shown read-only, first in the form.
    orderNumber: this.fb.control({ value: '', disabled: true }),
    importExport: this.fb.control<string | null>(null),
    currency: this.fb.control<string | null>(null, [Validators.required]),
    amount: this.fb.control<number | null>(null, [Validators.required]),
    whatToDo: this.fb.control<string | null>(null),
    maturityDate: this.fb.control<Date | null>(null),
    windowFix: this.fb.control<string | null>(null),
    fromDate: this.fb.control<Date | null>(null),
    toDate: this.fb.control<Date | null>(null),
    bookingRate: this.fb.control<number | null>(null),
    forwardContactNo: [''],
    outstandingAmount: this.fb.control<number | null>(null),
    // EEFC Conversion / Bill Discount / PCFC Disbursement extras.
    transactionDetail: this.fb.control<string | null>(null),
    currency2: this.fb.control<string | null>(null),
    // Upcoming: schedules the order for a future date (ActiveStatus = 'Upcoming').
    upcoming: this.fb.control<boolean>(false),
    upcomingDate: this.fb.control<Date | null>(null),
    // Editable Dealer Rate — only shown/saved for a Done / InvoiceGenerated order.
    baseCurrencyD: this.fb.control<number | null>(null),
    homeCurrencyD: this.fb.control<number | null>(null),
    spotD: this.fb.control<number | null>(null),
    premiumDiscountD: this.fb.control<number | null>(null),
    marginD: this.fb.control<number | null>(null),
    netRateD: this.fb.control<number | null>(null),
    // Dealer meta on a booked order — Name + Remarks editable (times are read-only).
    dealerName: this.fb.control<string | null>(null),
    remarks: this.fb.control<string | null>(null),
    // Trial Transaction only — "Bank Rate", saved to the ClientRate column.
    bankRate: this.fb.control<number | null>(null),
  });

  /**
   * Screen config from route `data` — lets this same form serve FTP Order Entry,
   * Client Order and Trial Transaction (different ActiveStatus / title / Bank Rate).
   */
  protected readonly config: OrderScreenConfig =
    (this.route.snapshot.data['orderConfig'] as OrderScreenConfig | undefined) ?? FTP_ORDER_CONFIG;
  protected readonly showBankRate = this.config.showBankRate;

  /** The loaded order (edit mode) — drives the read-only Live Rate + the rate sections' visibility. */
  protected readonly loaded = signal<FtpOrderDetail | null>(null);

  /**
   * Live Rate + Dealer Rate sections show once the order is booked, i.e. its
   * ActiveStatus is Done or InvoiceGenerated (matches the legacy app).
   */
  protected readonly showRates = computed(() => {
    const s = (this.loaded()?.activeStatus ?? '').trim().toLowerCase();
    return s === 'done' || s === 'invoicegenerated';
  });

  /** The currently-selected transaction type as a signal (for the conditional block). */
  private readonly txnTypeValue = signal<number | null>(null);
  /** Window vs Fix selection as a signal (drives the forward date fields). */
  private readonly windowFixValue = signal<string | null>(null);
  /** Selected Transaction Detail as a signal — Bill Discount drives its date rules off this. */
  private readonly txnDetailValue = signal<string | null>(null);
  /** "Upcoming" checkbox — reveals the Upcoming Date field and sets ActiveStatus = 'Upcoming'. */
  protected readonly upcoming = signal(false);

  /**
   * Transaction-type field visibility — the shared rules used by BOTH this screen
   * and the Dealer Pad, so the same type shows/hides the same controls everywhere.
   * Bill Discount's date rules follow the picked Transaction Detail.
   */
  private readonly vis = computed(() =>
    orderFieldVisibility(this.txnTypeValue(), this.windowFixValue(), this.txnDetailValue()),
  );

  /** Forward Cancellation (id 5) — also shows Forward Contact No. / Outstanding Amount. */
  protected readonly isForwardCancellation = computed(() => this.vis().isForwardCancellation);
  /** Utilization (id 8). */
  protected readonly isUtilization = computed(() => this.vis().isUtilization);
  /** Cancellation or Utilization — both consume a parent Forward via the picker. */
  protected readonly consumesForward = computed(() => this.vis().consumesForward);
  /** EEFC Conversion (6) / Bill Discount (7) / PCFC Disbursement (9) — Transaction Detail + Currency2. */
  protected readonly showConversionFields = computed(() => this.vis().showConversionFields);
  /** Maturity-only types (Cash/TOM/SPOT + EEFC/PCFC). */
  protected readonly isMaturityType = computed(() => this.vis().isMaturityType);
  /** Forward-dated types (Forward + Bill Discount): Window/Fix drives the date fields. */
  protected readonly isForwardDated = computed(() => this.vis().isForwardDated);

  /** Date-selection (Window/Fix + dates) applies to a Forward-dated or consuming type. */
  private readonly usesForwardDates = computed(() => this.vis().showWindowFix);

  // ---- Transaction-type-driven field visibility ---------------------------
  protected readonly showWindowFix = computed(() => this.vis().showWindowFix);
  protected readonly showFromTo = computed(() => this.vis().showFromTo);
  protected readonly showMaturity = computed(() => this.vis().showMaturity);
  protected readonly showBookingRate = computed(() => this.vis().showBookingRate);

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
    this.dropdowns.get('TransactionType').subscribe((o) => this.txnOptions.set(o));
    this.dropdowns.get('Currency').subscribe((o) => this.currencyOptions.set(o));
    this.dropdowns.get('TransactionDetail').subscribe((o) => this.transactionDetailOptions.set(o));
    this.dropdowns.get('CURRENCY2').subscribe((o) => this.currency2Options.set(o));

    // Client → Client Bank cascade. (DestroyRef passed explicitly because
    // takeUntilDestroyed() needs an injection context, which ngOnInit is not.)
    this.form.controls.client.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clientId) => {
        this.form.controls.clientBank.setValue(null, { emitEvent: false });
        this.bankOptions.set([]);
        if (clientId)
          this.dropdowns.get('ClientBank', clientId).subscribe((o) => {
            this.bankOptions.set(o);
            // Only one bank on file → pick it automatically.
            if (o.length === 1) this.form.controls.clientBank.setValue(o[0].value as number);
          });
      });

    // Amount must not exceed the picked Forward's remaining balance (consuming types).
    this.form.controls.amount.addValidators((c) => {
      const limit = this.balanceLimit();
      if (limit == null) return null;
      const val = c.value as number | null;
      return val != null && val > limit ? { exceedsBalance: true } : null;
    });

    this.form.controls.transactionType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.txnTypeValue.set(v);

        // Leaving the conversion types drops any stale Transaction Detail / Currency2.
        if (!this.showConversionFields()) {
          this.form.patchValue({ transactionDetail: null, currency2: null }, { emitEvent: false });
          this.txnDetailValue.set(null);
        }

        this.applyDateFieldRules();

        // Leaving a consuming type clears the parent-Forward link and its balance cap.
        if (!this.consumesForward()) {
          this.clearForwardLink();
        } else if (!this.suppressPicker) {
          // Cancellation / Utilization chosen by the user → pick the parent Forward.
          this.openForwardPicker();
        }
      });

    // Transaction Detail drives date behaviour for two types:
    //  • EEFC Conversion (6): its Maturity settlement offset follows the Cash/Tom/Spot detail.
    //  • Bill Discount (7): the Cash/Tom/Spot/Forward detail decides Window/Fix + date visibility.
    this.form.controls.transactionDetail.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((detail) => {
        this.txnDetailValue.set(detail);
        if (this.txnTypeValue() === FtpOrderEntryComponent.TXN_BILL_DISCOUNT) {
          this.applyDateFieldRules();
        } else if (this.txnTypeValue() === FtpOrderEntryComponent.TXN_EEFC_CONVERSION) {
          this.applyWorkingDate();
        }
      });

    // Upcoming checkbox drives the Upcoming Date field's visibility.
    this.form.controls.upcoming.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((on) => {
        this.upcoming.set(!!on);
        if (!on) this.form.controls.upcomingDate.setValue(null, { emitEvent: false });
      });

    // Import → Buy, Export → Sell (auto-set "What To Do").
    this.form.controls.importExport.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v === 'Import') this.form.controls.whatToDo.setValue('Buy');
        else if (v === 'Export') this.form.controls.whatToDo.setValue('Sell');
      });

    // Forward Window: the To Date can't fall before the From Date — warn on edit.
    merge(this.form.controls.fromDate.valueChanges, this.form.controls.toDate.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateFromToDates());

    // Track Window/Fix and clear whichever date fields it hides.
    this.form.controls.windowFix.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.windowFixValue.set(v);
        if (v === 'Window') {
          this.form.controls.maturityDate.setValue(null, { emitEvent: false });
        } else if (v === 'Fix') {
          this.form.patchValue({ fromDate: null, toDate: null }, { emitEvent: false });
        }
        // Default whichever date field(s) Window/Fix now exposes.
        this.applyWorkingDate();
      });

    // Outstanding Amount = remaining balance − the amount being cancelled/utilized.
    this.form.controls.amount.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncOutstanding());

    // Dealer Net Rate auto-recalc (legacy CalNetRate): editing Spot / Premium /
    // Margin recomputes it. A manual edit to Net Rate itself is not an input here,
    // so it sticks until one of Spot/Premium/Margin changes again.
    merge(
      this.form.controls.spotD.valueChanges,
      this.form.controls.premiumDiscountD.valueChanges,
      this.form.controls.marginD.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcDealerNetRate());

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    if (id > 0) {
      this.recordId.set(id);
      this.loadOrder(id);
    }
  }

  private loadOrder(id: number): void {
    this.service.getById(id).subscribe((o) => {
      this.loaded.set(o);
      // Don't pop the Forward picker while an existing order populates the form.
      this.suppressPicker = true;
      // Keep the order's saved Net Rate — don't let the patch's rate-field emissions recalc it.
      this.suppressNetRecalc = true;
      this.form.patchValue({
        baseCurrencyD: o.baseCurrencyD ?? null,
        homeCurrencyD: o.homeCurrencyD ?? null,
        spotD: o.spotD ?? null,
        premiumDiscountD: o.premiumDiscountD ?? null,
        marginD: o.marginD ?? null,
        netRateD: o.netRateD ?? null,
        dealerName: o.dealerName ?? null,
        remarks: o.remarks ?? null,
        bankRate: o.clientRate ?? null,
        transactionType: o.transactionTypeID ?? null,
        orderNumber: o.orderNumber ?? '',
        importExport: o.impExp ?? null,
        currency: o.currencyCode ?? null,
        amount: o.amount ?? null,
        whatToDo: o.buySell ?? null,
        maturityDate: o.maturityDate ? new Date(o.maturityDate) : null,
        windowFix: o.dateSelectionType ?? null,
        fromDate: o.fromDate ? new Date(o.fromDate) : null,
        toDate: o.toDate ? new Date(o.toDate) : null,
        bookingRate: o.bookingRate ?? null,
        forwardContactNo: o.forwardContactNo ?? '',
        outstandingAmount: o.outstandingAmount ?? null,
        transactionDetail: o.transactionDetail ?? null,
        currency2: o.billDiscount ?? null,
        upcoming: (o.activeStatus ?? '').toLowerCase() === 'upcoming',
        upcomingDate: o.upcomingDate ? new Date(o.upcomingDate) : null,
      });
      this.txnTypeValue.set(o.transactionTypeID ?? null);
      this.windowFixValue.set(o.dateSelectionType ?? null);
      this.txnDetailValue.set(o.transactionDetail ?? null);
      this.upcoming.set((o.activeStatus ?? '').toLowerCase() === 'upcoming');
      this.refOrderNumber.set(o.refOrderNumber ?? null);
      this.suppressPicker = false;
      this.suppressNetRecalc = false;
      // A saved Cancellation/Utilization keeps its deal-owned fields locked.
      if (this.consumesForward()) this.setConsumedFieldsDisabled(true);

      // Restore client + bank without firing the cascade reset.
      this.form.controls.client.setValue(o.clientID ?? null, { emitEvent: false });
      if (o.clientID) {
        this.dropdowns.get('ClientBank', o.clientID).subscribe((opts) => {
          this.bankOptions.set(opts);
          this.form.controls.clientBank.setValue(o.clientBank ?? null, { emitEvent: false });
        });
      }
    });
  }

  /**
   * Recomputes the Dealer Net Rate from the dealer-entered Spot / Premium / Margin
   * using the shared legacy formula (CalNetRate). Only runs for a booked order (the
   * Dealer Rate section is shown) and is skipped while an order is loading so the
   * saved Net Rate is preserved.
   */
  private recalcDealerNetRate(): void {
    if (this.suppressNetRecalc || !this.showRates()) return;
    const v = this.form.getRawValue();
    const net = computeNetRate({
      spot: Number(v.spotD) || 0,
      premium: Number(v.premiumDiscountD) || 0,
      margin: Number(v.marginD) || 0,
      direction: v.importExport === 'Import' ? 'Import' : 'Export',
      transactionType: v.transactionType != null ? String(v.transactionType) : null,
      windowMode: v.windowFix,
      maturityDate: toDmy(v.maturityDate),
      transactionDetail: v.transactionDetail,
    });
    this.form.controls.netRateD.setValue(net, { emitEvent: false });
  }

  /** Opens the parent-Forward picker for the current client. */
  protected openForwardPicker(): void {
    const clientId = this.form.controls.client.value;
    if (!clientId) {
      this.notify.error('Select a client first to choose a Forward deal.');
      return;
    }
    this.dialog
      .open(ForwardDealPickerComponent, {
        width: '70vw',
        maxWidth: '70vw',
        autoFocus: false,
        data: {
          clientId,
          recordId: this.recordId() || undefined,
          action: this.isForwardCancellation() ? 'cancel' : 'utilize',
        },
      })
      .afterClosed()
      .subscribe((deal?: ForwardDeal) => {
        if (deal) this.applyForwardDeal(deal);
      });
  }

  /** Copies the picked Forward's details into the form and caps Amount at its balance. */
  private applyForwardDeal(deal: ForwardDeal): void {
    this.refOrderNumber.set(deal.orderNumber ?? null);
    const balance = deal.balance ?? 0;
    this.balanceLimit.set(balance);

    const fix = deal.dateSelectionType === 'Fix';
    const buySell =
      deal.impExp === 'Import' ? 'Buy' : deal.impExp === 'Export' ? 'Sell' : null;

    // Patch without emitting so the Window/Fix & Import/Export subscriptions don't
    // fight the values we're setting here; sync the driving signals manually instead.
    this.form.patchValue(
      {
        importExport: deal.impExp ?? null,
        currency: deal.currencyCode ?? null,
        amount: balance,
        whatToDo: buySell,
        bookingRate: deal.bookingRate ?? null,
        windowFix: deal.dateSelectionType ?? null,
        forwardContactNo: deal.forwardContactNo ?? '',
        maturityDate: fix && deal.maturityDate ? new Date(deal.maturityDate) : null,
        fromDate: !fix && deal.fromDate ? new Date(deal.fromDate) : null,
        toDate: !fix && deal.toDate ? new Date(deal.toDate) : null,
      },
      { emitEvent: false },
    );
    this.windowFixValue.set(deal.dateSelectionType ?? null);
    this.form.controls.amount.updateValueAndValidity({ emitEvent: false });

    // The picked deal owns Import/Export, Currency and What To Do — lock them.
    this.setConsumedFieldsDisabled(true);
    this.syncOutstanding();
  }

  /** Drops the parent-Forward link and its balance cap (leaving a consuming type). */
  private clearForwardLink(): void {
    this.refOrderNumber.set(null);
    this.balanceLimit.set(null);
    this.setConsumedFieldsDisabled(false);
    this.form.controls.amount.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Re-applies the Window/Fix requirement and clears the date/rate fields that no
   * longer apply, based on the effective sub-type (transaction type, or the
   * Transaction Detail for conversion types). Shared by the type + detail changes.
   */
  private applyDateFieldRules(): void {
    const wf = this.form.controls.windowFix;
    if (this.usesForwardDates()) {
      wf.addValidators(Validators.required);
    } else {
      wf.removeValidators(Validators.required);
      if (wf.value !== null) wf.setValue(null, { emitEvent: false });
      this.windowFixValue.set(null);
      this.form.patchValue({ fromDate: null, toDate: null }, { emitEvent: false });
    }
    wf.updateValueAndValidity({ emitEvent: false });

    // Maturity-only types (Cash/TOM/SPOT + EEFC/PCFC): no Booking Rate or Window/Fix dates.
    if (this.isMaturityType()) {
      this.form.patchValue({ bookingRate: null, fromDate: null, toDate: null }, { emitEvent: false });
    }

    this.applyWorkingDate();
  }

  /**
   * Settlement offset (calendar days) added to today before the holiday roll-forward,
   * mirroring the legacy SetCurrentDate: TOM = +1, SPOT = +2, EEFC = by its Cash/Tom/Spot
   * detail; Cash / PCFC / Forward / Bill Discount = +0.
   */
  private maturityOffsetDays(): number {
    const id = this.txnTypeValue();
    if (id === 2) return 1; // TOM  → T+1
    if (id === 3) return 2; // SPOT → T+2
    // EEFC Conversion (6) & Bill Discount (7) take their offset from the Cash/Tom/Spot detail.
    if (
      id === FtpOrderEntryComponent.TXN_EEFC_CONVERSION ||
      id === FtpOrderEntryComponent.TXN_BILL_DISCOUNT
    ) {
      const detail = (this.form.controls.transactionDetail.value ?? '').trim().toLowerCase();
      if (detail === 'tom') return 1;
      if (detail === 'spot') return 2;
      return 0; // Cash / Forward / not yet picked
    }
    return 0; // Cash (1), PCFC (9), Forward (4)
  }

  /**
   * Calls usp_RF_CheckHolidayDate (via the API) for today + the settlement offset, and binds
   * the returned working day into the currently-visible date field(s): Cash/TOM/SPOT + EEFC/PCFC
   * show Maturity only; a Forward/Bill-Discount on Window shows From/To (both get the date,
   * offset 0). Fired on every transaction-type / Transaction-Detail / Window-Fix change.
   */
  private applyWorkingDate(): void {
    if (this.suppressPicker) return; // editing: keep the order's saved dates
    if (this.consumesForward()) return; // Cancellation/Utilization dates come from the parent Forward
    // Nothing visible to fill yet — skip the round-trip.
    if (!this.showFromTo() && !this.showMaturity()) return;

    const base = addDays(new Date(), this.maturityOffsetDays());
    this.service.getWorkingDate(toIsoDate(base)).subscribe((iso) => {
      const wd = parseIsoDate(iso);
      if (!wd) return;
      // Re-check visibility: it may have changed while the request was in flight.
      if (this.showFromTo()) {
        this.form.patchValue({ fromDate: wd, toDate: wd }, { emitEvent: false });
      } else if (this.showMaturity()) {
        this.form.controls.maturityDate.setValue(wd, { emitEvent: false });
      }
    });
  }

  /** Outstanding Amount = remaining balance − the amount being cancelled/utilized. */
  private syncOutstanding(): void {
    const limit = this.balanceLimit();
    if (limit == null) return;
    const amt = Number(this.form.controls.amount.value ?? 0);
    const outstanding = Math.max(limit - (Number.isNaN(amt) ? 0 : amt), 0);
    this.form.controls.outstandingAmount.setValue(outstanding, { emitEvent: false });
  }

  /** Locks/unlocks the deal-owned fields (Import/Export, Currency, What To Do). */
  private setConsumedFieldsDisabled(disabled: boolean): void {
    const opts = { emitEvent: false };
    const { importExport, currency, whatToDo } = this.form.controls;
    if (disabled) {
      importExport.disable(opts);
      currency.disable(opts);
      whatToDo.disable(opts);
    } else {
      importExport.enable(opts);
      currency.enable(opts);
      whatToDo.enable(opts);
    }
  }

  /**
   * Forward Window date sanity check: the To Date must not be earlier than the
   * From Date. Returns false (and notifies) when the range is invalid; a no-op
   * for any type/mode that doesn't show the From/To fields.
   */
  private validateFromToDates(): boolean {
    if (!this.showFromTo()) return true;
    const from = this.form.controls.fromDate.value;
    const to = this.form.controls.toDate.value;
    if (from && to && to < from) {
      this.notify.error('To date cannot be less than from date.');
      return false;
    }
    return true;
  }

  /** Error text for the Amount field (balance cap message takes precedence). */
  protected amountError(): string {
    return this.form.controls.amount.hasError('exceedsBalance')
      ? `Amount cannot exceed the remaining balance (${this.balanceLimit()}).`
      : 'Enter an amount.';
  }

  protected submit(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fill the required fields.');
      return;
    }
    // Forward Window: block booking when the To Date precedes the From Date.
    if (!this.validateFromToDates()) return;
    // check whether the amount is greater than 1 million if yes then show a confirmation dialog,handle null  
   
    if (v.amount !== null && v.amount !== undefined && v.amount >= 1000000) {
      this.confirm
        .confirm({
          title: 'Confirm Large Amount',
          message: 'The amount entered is greater than 1 million. Are you sure you want to proceed?',
          confirmText: 'Yes, Proceed',
          cancelText: 'No, Cancel',
          icon: 'warning',
        })
        .subscribe((ok) => {
          if (ok) this.book();
        });
      return; 
    }
    this.confirm
      .confirm({
        title: 'Book this order?',
        message: 'The order will be saved to the order booking.',
        confirmText: 'Book Order',
        icon: 'check_circle',
      })
      .subscribe((ok) => {
        if (ok) this.book();
      });
  }

  private book(): void {
    this.saving.set(true);
    const v = this.form.getRawValue();
    const fields: Record<string, string | null> = {
      Action: this.isEdit() ? 'UPDATE' : 'INSERT',
      RecordID: this.isEdit() ? String(this.recordId()) : null,
      ClientID: numStr(v.client),
      ClientBank: numStr(v.clientBank),
      TransactionTypeID: numStr(v.transactionType),
      OrderNumber: v.orderNumber || null,
      ImpExp: v.importExport,
      CurrencyCode: v.currency,
      Amount: numStr(v.amount),
      BuySell: v.whatToDo,
      // Only persist the date/rate fields the current transaction type actually shows.
      MaturityDate: this.showMaturity() ? toDmy(v.maturityDate) : null,
      DateSelectionType: this.showWindowFix() ? v.windowFix : null,
      FromDate: this.showFromTo() ? toDmy(v.fromDate) : null,
      ToDate: this.showFromTo() ? toDmy(v.toDate) : null,
      BookingRate: this.showBookingRate() ? numStr(v.bookingRate) : null,
      ForwardContactNo: this.isForwardCancellation() ? v.forwardContactNo || null : null,
      OutstandingAmount: this.isForwardCancellation() ? numStr(v.outstandingAmount) : null,
      // Link a Cancellation / Utilization back to the parent Forward's OrderNumber.
      RefOrderNumber: this.consumesForward() ? this.refOrderNumber() : null,
      // EEFC Conversion / Bill Discount / PCFC Disbursement extras.
      TransactionDetail: this.showConversionFields() ? v.transactionDetail : null,
      BillDiscount: this.showConversionFields() ? v.currency2 : null,
      // Upcoming: schedule the order for a future date; flags it as 'Upcoming'.
      UpcomingDate: v.upcoming ? toDmy(v.upcomingDate) : null,
      // A booked (Done/InvoiceGenerated) order keeps its status on save; a non-booked
      // order flips to Upcoming, else the screen's status (Client / Trial, or New for FTP).
      ActiveStatus: this.showRates()
        ? this.loaded()?.activeStatus ?? (this.config.status ?? 'New')
        : v.upcoming
          ? 'Upcoming'
          : this.config.status ?? 'New',
      // Editable Dealer Rate — sent only for a booked order (else the proc keeps the current value).
      ...(this.showRates()
        ? {
            BaseCurrencyD: numStr(v.baseCurrencyD),
            HomeCurrencyD: numStr(v.homeCurrencyD),
            SpotD: numStr(v.spotD),
            PremiumDiscountD: numStr(v.premiumDiscountD),
            MarginD: numStr(v.marginD),
            NetRateD: numStr(v.netRateD),
            // Only Dealer Name + Remarks are editable; the times stay read-only.
            DealerName: v.dealerName ?? null,
            Remarks: v.remarks ?? null,
          }
        : {}),
      // Trial Transaction "Bank Rate" → ClientRate column (only on the Trial screen).
      ...(this.config.showBankRate ? { ClientRate: numStr(v.bankRate) } : {}),
    };

    this.service
      .book(fields)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe((res) => {
        if (res.success) {
          this.notify.success(res.message || 'Order booked successfully.');
          this.router.navigate(['/ftp-order-entry']);
        } else {
          this.notify.error(res.message || 'Could not book the order.');
        }
      });
  }

  protected clear(): void {
    this.form.reset();
    this.bankOptions.set([]);
    this.txnTypeValue.set(null);
    this.windowFixValue.set(null);
    this.txnDetailValue.set(null);
    this.upcoming.set(false);
    this.clearForwardLink();
  }

  protected cancel(): void {
    this.router.navigate([this.config.basePath]);
  }
}

function numStr(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null : String(v);
}

/** ISO yyyy-MM-dd → local Date (midnight), avoiding the UTC shift of `new Date('yyyy-MM-dd')`. */
function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** Local Date → ISO yyyy-MM-dd (no timezone shift). */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adds calendar days to a date (month/year rollover handled natively). */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Date → dd/MM/yyyy (style 103, matching the booking proc). */
function toDmy(date: Date | null): string | null {
  if (!date) return null;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}
