import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DropdownService } from '../../shared/services/dropdown.service';
import { orderFieldVisibility } from '../../shared/rates/order-field-visibility';
import {
  BANKS,
  CURRENCY_PAIRS,
  Deal,
  DealDirection,
  OrderClientDetailsApi,
  OrderContactApi,
  TransactionType,
} from './dealer-pad.models';
import { computeNetRate, DealerPadService } from './dealer-pad.service';
import { ClientsService } from '../clients/clients.service';

/**
 * Explicit DB-column → form-control mappings where the proc's column name does
 * not match the control name. Keys are normalized (lowercase, alphanumeric only).
 * Anything not listed falls back to name-based matching.
 */
const COLUMN_TO_CONTROL: Record<string, string> = {
  // Client details
  clientid: 'clientId', // (hidden) Client id   ← ClientID
  contact1: 'contactNo', // "Contact No."        ← Contact1
  contactnumber: 'contactNumber', // "Contact Number"     ← ContactNumber
  contactperson1: 'contactPerson', // "Contact Person 1"   ← ContactPerson1
  emailid: 'email', // "Email ID"           ← EmailID
  rmnumber: 'rmNo', // "RM No."             ← RMNumber
  // Deal details
  clientbank: 'bank', // Bank                ← ClientBank (bank id)
  transactiontypeid: 'transactionType', // Transaction Type    ← TransactionTypeID (value)
  currencycode: 'currencyPair', // Currency            ← CurrencyCode
  ordernumber: 'orderNo', // Order No            ← OrderNumber
  dateselectiontype: 'windowFix', // Window / Fix        ← DateSelectionType
  fromdate: 'fromDate', // From Date           ← FromDate
  todate: 'toDate', // To Date             ← ToDate
  maturitydate: 'maturityDate', // Maturity Date       ← MaturityDate
  forwardcontactno: 'forwardContactNo', // Forward Contact No. ← ForwardContactNo
  billdiscount: 'currency2', // Currency 2          ← BillDiscount
  // transactiondetail / bookingrate / outstandingamount auto-map by matching name.
};

@Component({
  selector: 'app-dealer-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  templateUrl: './dealer-pad.html',
  styleUrl: './dealer-pad.scss',
})
export class DealerPadComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly dropdowns = inject(DropdownService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly clients = inject(ClientsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly svc = inject(DealerPadService);

  /** Client document filenames (null = not on file) — power the download buttons. */
  protected readonly slaDoc = signal<string | null>(null);
  protected readonly authDoc = signal<string | null>(null);

  protected readonly directions: DealDirection[] = ['Import', 'Export'];

  // Dropdown options — seeded with fallbacks, then overwritten from USP_RF_BINDDROPDOWN.
  protected readonly txnOptions = signal<SelectOption[]>(
    (['Spot', 'Cash', 'Tom', 'Forward'] as TransactionType[]).map((t) => ({ value: t, label: t })),
  );
  protected readonly currencyOptions = signal<SelectOption[]>(
    CURRENCY_PAIRS.map((p) => ({ value: p, label: p })),
  );
  protected readonly bankOptions = signal<SelectOption[]>(BANKS.map((b) => ({ value: b, label: b })));
  protected readonly bankDealerOptions = signal<SelectOption[]>([]);
  /** Transaction Detail (Cash/Tom/Forward/Spot) + Currency 2 — for the conversion types. */
  protected readonly transactionDetailOptions = signal<SelectOption[]>([]);
  protected readonly currency2Options = signal<SelectOption[]>([]);
  /** Contacts (from table 3) backing the Bank Dealer dropdown, with their landlines. */
  private readonly bankDealerContacts = signal<OrderContactApi[]>([]);

  protected readonly paused = signal(false);
  /** Collapse/expand the Client Information section. */
  protected readonly showClientInfo = signal(true);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingSource = signal<'pending' | 'saved' | null>(null);
  /**
   * The loaded deal's actual Cash/Forward TransactionDetail — only Bill Discount
   * (type 7) uses it, and the Dealer Pad has no selector for it, so it must come
   * from the deal being edited (null for a fresh deal). Feeds computeNetRate so
   * type 7 takes the correct branch instead of falling back to the type label.
   */
  private readonly dealTransactionDetail = signal<string | null>(null);
  /** True while a clicked deal's full details are being loaded. */
  protected readonly detailsLoading = signal(false);

  protected readonly pendingSearch = signal('');
  protected readonly savedSearch = signal('');

  /** True once the "Dealer name is empty" warning has been shown for this deal. */
  private dealerNameWarned = false;

  protected readonly windowFixOptions = ['Window', 'Fix'];

  protected readonly form = this.fb.nonNullable.group({
    // Client Information — all read-only (populated from the selected client/deal)
    clientId: [{ value: '', disabled: true }],
    clientName: [{ value: '', disabled: true }],
    branch: [{ value: '', disabled: true }],
    contactNo: [{ value: '', disabled: true }],
    contactPerson: [{ value: '', disabled: true }],
    branchCode: [{ value: '', disabled: true }],
    contactNumber: [{ value: '', disabled: true }],
    rmName: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
    rmNo: [{ value: '', disabled: true }],
    documentsComplete: [{ value: false, disabled: true }],
    bankMargin: [{ value: 0.05, disabled: true }],
    contactPerson2: [{ value: '', disabled: true }],

    // Deal Details (Order No is read-only; Transaction Type right after it)
    orderNo: [{ value: '', disabled: true }],
    transactionType: ['', [Validators.required]],
    direction: ['Export' as DealDirection, [Validators.required]],
    currencyPair: ['USD / INR', [Validators.required]],
    // EEFC Conversion / Bill Discount / PCFC Disbursement extras (same as FTP Order Entry).
    transactionDetail: [''],
    currency2: [''],
    bookingRate: [0],
    amount: [0, [Validators.required, Validators.min(1)]],
    bank: [''],
    bankDealerName: [''],
    dealingRoomLandline: [''],
    dealerName: [''],
    forwardContactNo: [''],
    outstandingAmount: [0],
    windowFix: ['Window'],
    fromDate: [''],
    toDate: [''],
    maturityDate: [''],
    forwardContractNo: [''],
    remarks: [''],

    // Live Rates — auto-filled from the market feed (Pull / deal-click), then
    // editable by the dealer. Net Rate is derived (see liveNetRate).
    liveBase: [0],
    liveHome: [0],
    liveSpot: [0],
    livePremium: [0],
    liveMargin: [0],
    liveNet: [0],

    // Dealer Rates — entered manually by the dealer.
    dealerBase: [0],
    dealerHome: [0],
    spot: [0, [Validators.required]],
    premium: [0],
    // Blank on load — the dealer enters the margin manually (0 is assumed until then).
    margin: new FormControl<number | null>(null),
    // Net Rate is derived (see netRate) but editable — a manual edit sticks until
    // Spot/Premium/Margin change again (mirrors the Live Rates Net Rate).
    dealerNet: [0],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Dealer net rate derived from the (editable) form values (legacy CalNetRate). */
  protected readonly netRate = computed(() => {
    const v = this.formValue();
    return computeNetRate({
      spot: Number(v.spot) || 0,
      premium: Number(v.premium) || 0,
      margin: Number(v.margin) || 0,
      direction: (v.direction as DealDirection) ?? 'Export',
      transactionType: String(v.transactionType ?? ''),
      windowMode: v.windowFix ?? 'Window',
      maturityDate: v.maturityDate ?? null,
      // Type 7 (Bill Discount) keys off the Cash/Forward Transaction Detail: prefer the
      // now-visible form control, then the loaded deal's value, then the type label.
      transactionDetail: v.transactionDetail || this.dealTransactionDetail() || this.txnLabel(),
    });
  });

  /** Live Rates net rate — derived from the (now editable) Live Rates inputs. */
  protected readonly liveNetRate = computed(() => {
    const v = this.formValue();
    return computeNetRate({
      spot: Number(v.liveSpot) || 0,
      premium: Number(v.livePremium) || 0,
      margin: Number(v.liveMargin) || 0,
      direction: (v.direction as DealDirection) ?? 'Export',
      transactionType: String(v.transactionType ?? ''),
      windowMode: v.windowFix ?? 'Window',
      maturityDate: v.maturityDate ?? null,
      transactionDetail: v.transactionDetail || this.dealTransactionDetail() || this.txnLabel(),
    });
  });

  // --- Rate bands ----------------------------------------------------------
  /**
   * The market pair for the selected currency. Accepts either a full pair
   * ("USD / INR") or a single currency code from the Currency dropdown ("USD"),
   * which is paired with the home currency (INR) for board lookups.
   */
  private readonly currentPair = computed(() => {
    const c = (this.formValue().currencyPair ?? '').toString().trim();
    if (!c) return 'USD / INR';
    return c.includes('/') ? c : `${c} / INR`;
  });
  /** Base currency of the selected pair, e.g. "USD" from "USD / INR" (Dealer Rates). */
  protected readonly baseCcy = computed(() => (this.currentPair().split('/')[0] ?? '').trim());
  /** Quote/home currency, e.g. "INR". */
  protected readonly homeCcy = computed(() => (this.currentPair().split('/')[1] ?? '').trim());

  /** Forward premium (legacy PremiumForwardType) for transaction types 4/5/8. */
  private readonly premiumForward = signal(0);

  // --- Transaction-type-driven field visibility ----------------------------
  /** Description (label) of the selected transaction type, lower-cased. */
  private readonly txnLabel = computed(() => {
    const v = this.formValue().transactionType;
    const opt = this.txnOptions().find((o) => String(o.value) === String(v));
    return (opt?.label ?? String(v ?? '')).toLowerCase();
  });
  /**
   * Transaction-type field visibility — the SAME shared rules as FTP Order Entry
   * (keyed off the transaction-type id + Window/Fix), so a given type shows/hides
   * the same controls on both screens.
   */
  private readonly vis = computed(() => {
    // Transaction-type ids are 1..9; the form's default '' → 0 must count as
    // "nothing selected" so date-driven fields (e.g. Booking Rate) stay hidden
    // until a real type is picked.
    const id = Number(this.formValue().transactionType);
    return orderFieldVisibility(
      Number.isFinite(id) && id > 0 ? id : null,
      this.formValue().windowFix ?? null,
      this.formValue().transactionDetail ?? null,
    );
  });

  /** EEFC Conversion (6) / Bill Discount (7) / PCFC Disbursement (9) — Transaction Detail + Currency 2. */
  protected readonly showConversionFields = computed(() => this.vis().showConversionFields);
  protected readonly showWindowFix = computed(() => this.vis().showWindowFix);
  protected readonly showFromToDate = computed(() => this.vis().showFromTo);
  protected readonly showMaturityDate = computed(() => this.vis().showMaturity);
  /** Booking Rate — consuming types (Forward Cancellation / Utilization) + non-forward date types. */
  protected readonly showBookingRate = computed(() => this.vis().showBookingRate);
  /** Forward Cancellation (5) only: Forward Contact No. + Outstanding Amount. */
  protected readonly showForwardContact = computed(() => this.vis().showForwardContact);
  protected readonly showOutstanding = computed(() => this.vis().showOutstanding);

  protected readonly filteredPending = computed(() =>
    filter(this.svc.pending(), this.pendingSearch()),
  );
  protected readonly filteredSaved = computed(() => filter(this.svc.saved(), this.savedSearch()));

  constructor() {
    // Live rate board — poll the database feed (Proc_TFTPO_Mast_LiveRate). Only
    // real data is ever shown: if the feed returns nothing the board stays empty
    // (no dummy rows, no simulated ticks).
    interval(4000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (!this.paused()) this.svc.fetchLiveRates().subscribe({ error: () => {} });
      });

    // Refresh the Pending / Saved deal queues from the database.
    interval(5000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshQueues());

    // When the dealer changes the Bank Dealer Name, sync the Dealing Room Landline.
    this.form.controls.bankDealerName.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((val) => {
        const contact = this.bankDealerContacts().find((c) => this.contactValue(c) === val);
        if (contact) {
          this.form.controls.dealingRoomLandline.setValue(contact.landlineNo, { emitEvent: false });
        }
      });

    // Dealer Rates: recompute Spot when Base/Home currency changes (legacy CalDealerSpot).
    this.form.controls.dealerBase.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.calcDealerSpot());
    this.form.controls.dealerHome.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.calcDealerSpot());

    // Keep the (editable) Live Rates Net Rate in sync with the computed value.
    // Editing Spot/Premium/Margin recomputes it; a manual edit to Net Rate itself
    // is not a `liveNetRate` input, so it isn't overwritten until those change.
    effect(() => {
      const net = this.liveNetRate();
      this.form.controls.liveNet.setValue(net, { emitEvent: false });
    });

    // Keep the (editable) Dealer Rates Net Rate in sync with the computed value.
    // Editing Spot/Premium/Margin recomputes it; a manual edit to Net Rate itself
    // is not a `netRate` input, so the computed value is unchanged and the effect
    // does not re-run — the dealer's override is preserved.
    effect(() => {
      const net = this.netRate();
      this.form.controls.dealerNet.setValue(net, { emitEvent: false });
    });
  }

  /**
   * Port of the legacy CalDealerSpot(): derive the Dealer Rates Spot from the
   * dealer-entered Base/Home rates. For a USD/EUR/GBP base the two multiply;
   * otherwise Home is divided by Base. A blank, empty or zero input counts as 1.
   */
  private calcDealerSpot(): void {
    debugger;
    const num = (v: number | null | undefined) => Number(v) || 1;
    const base = num(this.form.controls.dealerBase.value);
    const home = num(this.form.controls.dealerHome.value);
    const baseCcy = this.baseCcy();
    const major = baseCcy === 'USD' || baseCcy === 'EUR' || baseCcy === 'GBP';
    const spot = major ? base * home : home / base;
    this.form.controls.spot.setValue(Number.isFinite(spot) ? Number(spot.toFixed(4)) : 0);
  }

  ngOnInit(): void {
    // Initial live-rate load (silent). Real data only — an empty or failed
    // response leaves the board empty rather than showing dummy rates.
    // The Live Rates band is NOT touched here — it only fills on user action.
    this.svc.fetchLiveRates().subscribe({ error: () => {} });

    // Pending (ActiveStatus=New) and Saved (ActiveStatus=Progressing) queues.
    this.refreshQueues();

    // Bind dropdowns from the common USP_RF_BINDDROPDOWN proc.
    this.dropdowns.get('TransactionType').subscribe({
      next: (o) => o.length && this.txnOptions.set(o),
      error: () => {},
    });
    this.dropdowns.get('Currency').subscribe({
      next: (o) => o.length && this.currencyOptions.set(o),
      error: () => {},
    });
    // Bank options are bound from the order details (table 5) on deal click — not on load.
    this.dropdowns.get('BankDealer').subscribe({
      next: (o) => this.bankDealerOptions.set(o),
      error: () => {},
    });
    // Conversion-type extras (EEFC / Bill Discount / PCFC): Transaction Detail + Currency 2.
    this.dropdowns.get('TransactionDetail').subscribe({
      next: (o) => this.transactionDetailOptions.set(o),
      error: () => {},
    });
    this.dropdowns.get('CURRENCY2').subscribe({
      next: (o) => this.currency2Options.set(o),
      error: () => {},
    });

    // Deep-link: /dealer-pad?recordId=29792 (e.g. edit from the FTP Upcoming Deal list)
    // opens that order directly, the same way clicking a Pending/Saved deal does.
    const recordId = Number(this.route.snapshot.queryParamMap.get('recordId'));
    if (Number.isFinite(recordId) && recordId > 0) this.openOrderById(recordId);
  }

  /**
   * Opens an existing order by RecordID via the same details API used when a
   * Pending/Saved deal is clicked. Used by the FTP Upcoming Deal "edit" action.
   */
  private openOrderById(recordId: number): void {
    this.editingId.set(String(recordId));
    this.detailsLoading.set(true);
    this.svc
      .getOrderDetails(recordId)
      .pipe(finalize(() => this.detailsLoading.set(false)))
      .subscribe({
        next: (details) => {
          this.applyOrderDetails(details);
          this.computeLiveBand();
        },
        error: () => this.notify.error('Could not open the deal.'),
      });
  }

  /** Reload both deal queues from the database. */
  refreshQueues(): void {
    this.svc.fetchPending().subscribe({ error: () => {} });
    this.svc.fetchSaved().subscribe({ error: () => {} });
  }

  /**
   * "Pull live rate" (⚡): snapshot the current board rate for the selected pair
   * into the Live Rates band. This is the only way the band refreshes from the
   * market (it never auto-updates).
   */
  pullLiveRate(): void {
    this.computeLiveBand();
  }

  /**
   * Port of the legacy BindLiveRate() logic. Computes the Live Rates band from
   * the current feed based on Import/Export, the transaction-type id and the
   * selected currency. Runs only while a deal is loaded (the Dealer Rates band
   * is entered manually).
   *
   * Transaction-type ids (TFTPO_Mast_TransType): 1/6/7/9 = cash-spot, 2 = tom,
   * 3 = cash, 4 & 5 = forward, 8 = cash-spot value-date.
   */
  private computeLiveBand(): void {
    const v = this.formValue();
    const dir = (v.direction as DealDirection) ?? 'Export';
    const txn = String(v.transactionType ?? '');
    const pair = this.currentPair();
    let margin = Number(this.form.controls.bankMargin.value) || 0;
    const fwd = this.premiumForward();
    const rates = this.svc.rates();

    const find = (b: string, q: string) =>
      rates.find((x) => {
        const p = x.pair.split('/');
        return p[0]?.trim() === b && p[1]?.trim() === q;
      });

    const parts = pair.split('/');
    const selBase = parts[0]?.trim() ?? '';
    const selQuote = parts[1]?.trim() ?? '';
    const cashSpot = txn === '1' || txn === '6' || txn === '7' || txn === '9';

    let base = 0;
    let home = 0;
    let spot = 0;
    let premium = 0;
    let net = 0;

    if (dir === 'Import') {
      if (pair === 'USD / INR') {
        const r = find('USD', 'INR');
        if (r) {
          if (txn === '2') {
            spot = r.spotAsk;
            premium = r.tomSpotBid;
            net = spot - premium + margin;
          } else if (txn === '3') {
            spot = r.spotAsk;
            premium = 0;
            net = spot + margin;
          } else if (txn === '4') {
            spot = r.spotAsk;
            premium = fwd;
            net = spot + premium + margin;
          } else if (txn === '5') {
            spot = r.spotBid;
            premium = fwd;
            net = spot + premium - margin;
          } else if (txn === '8') {
            margin = 0;
            spot = r.cashSpotBid;
            premium = fwd;
            net = premium + spot;
          } else {
            // cash-spot (1/6/7/9) and default
            spot = r.spotAsk;
            premium = r.cashSpotBid;
            net = spot - premium + margin;
          }
          base = home = txn === '8' ? 0 : spot;
        }
      } else {
        const inr = find(selBase, 'INR');
        const usd = find(selBase, 'USD');
        if (inr) {
          spot = inr.spotAsk;
          if (cashSpot) premium = inr.cashSpotBid;
          else if (txn === '2') premium = inr.tomSpotBid;
          else if (txn === '3') premium = 0;
          else if (txn === '4' || txn === '5') premium = fwd;
          else if (txn === '8') spot = inr.cashSpotBid;
        }
        if (usd) {
          if (selQuote === 'USD') {
            home = usd.spotAsk;
            spot = usd.spotAsk;
          }
          base = usd.spotAsk;
        }
        // Cross pair quoted in INR (e.g. EUR / INR): Home Currency is the USD/INR
        // leg, so Base (foreign/USD) × Home (USD/INR) reconstructs the foreign/INR
        // rate. (Legacy left the prior USD/INR value in HomeCurrency here.)
        if (selQuote === 'INR') {
          const usdInr = find('USD', 'INR');
          if (usdInr) home = usdInr.spotAsk;
        }
        if (cashSpot || txn === '2') net = spot - premium + margin;
        else if (txn === '3') net = spot + margin;
        else if (txn === '4') net = spot + premium + margin;
        else if (txn === '5') net = spot + premium - margin;
        else if (txn === '8') net = premium + spot;
      }
    } else {
      // Export
      if (pair === 'USD / INR') {
        const r = find('USD', 'INR');
        if (r) {
          if (txn === '2') {
            spot = r.spotBid;
            premium = r.tomSpotAsk;
            net = spot - premium - margin;
          } else if (txn === '3') {
            spot = r.spotBid;
            premium = 0;
            net = spot - premium - margin;
          } else if (txn === '4') {
            spot = r.spotBid;
            premium = fwd;
            net = spot + premium - margin;
          } else if (txn === '5') {
            spot = r.spotAsk;
            premium = fwd;
            net = spot + premium + margin;
          } else if (txn === '8') {
            margin = 0;
            spot = r.cashSpotAsk;
            premium = fwd;
            net = premium + spot;
          } else {
            spot = r.spotBid;
            premium = r.cashSpotAsk;
            net = spot - premium - margin;
          }
          base = home = txn === '8' ? 0 : spot;
        }
      } else {
        const inr = find(selBase, 'INR');
        const usd = find(selBase, 'USD');
        if (inr) {
          spot = inr.spotBid;
          if (cashSpot) premium = inr.cashSpotAsk;
          else if (txn === '2') premium = inr.tomSpotAsk;
          else if (txn === '3') premium = 0;
          else if (txn === '4' || txn === '5') premium = fwd;
          else if (txn === '8') spot = inr.cashSpotAsk;
        }
        if (usd) {
          if (selQuote === 'USD') {
            home = usd.spotBid;
            spot = usd.spotBid;
          }
          base = usd.spotBid;
        }
        // Cross pair quoted in INR (e.g. EUR / INR): Home Currency is the USD/INR
        // leg, so Base (foreign/USD) × Home (USD/INR) reconstructs the foreign/INR
        // rate. (Legacy left the prior USD/INR value in HomeCurrency here.)
        if (selQuote === 'INR') {
          const usdInr = find('USD', 'INR');
          if (usdInr) home = usdInr.spotBid;
        }
        if (cashSpot || txn === '2') net = spot - premium - margin;
        else if (txn === '3') net = spot - margin;
        else if (txn === '4') net = spot + premium - margin;
        else if (txn === '5') net = spot + premium + margin;
        else if (txn === '8') net = premium + spot;
      }
    }

    // Seed the (editable) Live Rates inputs. `net` above is the legacy snapshot
    // value; the displayed Net Rate is now derived live via `liveNetRate` so it
    // tracks any manual edits the dealer makes to these fields.
    void net;
    this.form.patchValue(
      { liveBase: base, liveHome: home, liveSpot: spot, livePremium: premium, liveMargin: margin },
      { emitEvent: false },
    );
  }

  loadDeal(d: Deal, source: 'pending' | 'saved'): void {
    this.editingId.set(d.id);
    this.editingSource.set(source);
    this.form.patchValue({
      clientName: d.clientName,
      contactPerson: d.contactPerson,
      contactNo: d.contactNo,
      email: d.email,
      rmName: d.rmName,
      bankMargin: d.bankMargin,
      direction: d.direction,
      currencyPair: d.currencyPair,
      amount: d.amount,
      maturityDate: d.maturityDate,
      bank: d.bank,
      transactionType: d.transactionType,
      dealerName: d.dealerName,
      spot: d.spot,
      premium: d.premium,
      // Margin is intentionally NOT populated — the dealer always enters it manually.
      remarks: d.remarks,
    });

    // Seed the (editable) Live Rates band from the feed for this deal.
    this.computeLiveBand();

    // Pull the full client + deal + bank-dealer contacts (USP_RF_GETORDERCLIENTDETAILS).
    const recordId = Number(d.id);
    if (!Number.isNaN(recordId)) {
      this.detailsLoading.set(true);
      this.svc
        .getOrderDetails(recordId)
        .pipe(finalize(() => this.detailsLoading.set(false)))
        .subscribe({
          next: (details) => this.applyOrderDetails(details),
          error: () => {},
        });
    }
  }

  /** Apply the result sets from USP_RF_GETORDERCLIENTDETAILS to the form. */
  private applyOrderDetails(details: OrderClientDetailsApi): void {
    // Bank dropdown options from table 5 (id + name); set before patching the
    // deal so the selected ClientBank resolves to its label.
    const banks = details.banks ?? [];
    if (banks.length) {
      this.bankOptions.set(banks.map((b) => ({ value: b.key, label: b.value })));
    }

    if (details.client) this.patchFormFromObject(details.client);
    if (details.deal) {
      this.patchFormFromObject(details.deal);
      // Capture the deal's real Cash/Forward detail (there's no form control for it)
      // so Bill Discount (type 7) computes the correct Net Rate.
      this.dealTransactionDetail.set(readField(details.deal, 'TransactionDetail'));
    }

    // Bank Dealer Name dropdown from table 3; select the first + its landline.
    const contacts = details.contacts ?? [];
    this.bankDealerContacts.set(contacts);
    this.bankDealerOptions.set(
      contacts.map((c) => ({ value: this.contactValue(c), label: this.contactValue(c) })),
    );
    if (contacts.length) {
      const first = contacts[0];
      this.form.patchValue({
        bankDealerName: this.contactValue(first),
        dealingRoomLandline: first.landlineNo,
      });
    }

    // Re-seed the Live Rates band now that bank / currency / margin are applied.
    this.computeLiveBand();

    // Load the client's SLA / Authorized-Letter status for the download buttons
    // and to drive "Documents complete?".
    const clientId = Number(this.form.controls.clientId.value);
    if (Number.isFinite(clientId) && clientId > 0) this.loadClientDocuments(clientId);
  }

  /**
   * Fetch the client's document status: enables the SLA / Authorized-Letter
   * downloads and sets "Documents complete?" to Yes only when BOTH are on file.
   */
  private loadClientDocuments(clientId: number): void {
    this.slaDoc.set(null);
    this.authDoc.set(null);
    this.clients.getById(clientId).subscribe({
      next: (c) => {
        this.slaDoc.set(c.hasSla ? (c.slaFileName ?? 'SLA document') : null);
        this.authDoc.set(c.hasAuthLetter ? (c.authLetterFileName ?? 'Authorized letter') : null);
        this.form.controls.documentsComplete.setValue(c.hasSla && c.hasAuthLetter);
      },
      error: () => {},
    });
  }

  /** Open a stored client document (SLA / Authorized Letter): preview inline, else download. */
  protected downloadDoc(which: 'sla' | 'auth'): void {
    const clientId = Number(this.form.controls.clientId.value);
    if (!Number.isFinite(clientId) || clientId <= 0) return;
    const name = which === 'sla' ? this.slaDoc() : this.authDoc();
    if (!name) return;
    const filename = this.docName(name, which);
    const ext = (filename.split('.').pop() ?? '').toLowerCase();
    const viewable = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'txt'].includes(ext);

    this.clients.getDocument(clientId, which).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (viewable) {
          window.open(url, '_blank');
        } else {
          // Non-previewable (e.g. .docx/.xlsx) — download with the real name + extension.
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      error: () => this.notify.error('Document not available.'),
    });
  }

  /** Recover the original file name (strip folder + the stored GUID prefix). */
  private docName(path: string | null, which: string): string {
    if (!path) return `${which}-document`;
    const file = path.split(/[\\/]/).pop() ?? path; // "{guid}_original.ext"
    const us = file.indexOf('_');
    return us >= 0 && us < file.length - 1 ? file.substring(us + 1) : file;
  }

  /** "Mr. Shyamal Gupta - 931284538" — the dropdown value for a contact. */
  private contactValue(c: OrderContactApi): string {
    return c.contactNumber ? `${c.contactName} - ${c.contactNumber}` : c.contactName;
  }

  /**
   * Generic patch: copy each column from a DB row onto the matching form control,
   * matching by name case-insensitively and ignoring spaces/underscores
   * (so "ClientName" / "Client Name" → `clientName`).
   */
  private patchFormFromObject(obj: Record<string, unknown>): void {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const byNorm = new Map<string, string>();
    for (const name of Object.keys(this.form.controls)) byNorm.set(norm(name), name);

    for (const [key, value] of Object.entries(obj)) {
      const k = norm(key);
      // Explicit alias takes precedence, then fall back to name matching.
      const control = COLUMN_TO_CONTROL[k] ?? byNorm.get(k);
      // Margin is never auto-filled — the dealer enters it manually every time.
      if (control === 'margin') continue;
      if (control && this.form.get(control) && value !== null && value !== undefined) {
        this.form.get(control)!.setValue(value);
      }
    }
  }

  save(): void {
    if (!this.validate()) return;
    this.confirm
      .confirm({
        title: 'Save deal?',
        message: 'Save this deal as in-progress?',
        confirmText: 'Save',
        icon: 'bookmark_added',
      })
      .subscribe((ok) => {
        // Save → ActiveStatus "Progressing"; no confirmation email is sent.
        if (ok) this.book('Progressing', 'Deal saved.');
      });
  }

  submit(): void {
    if (!this.validate()) return;

    // Warn once (warning-styled modal) if the Dealer Name is empty; clicking Ok
    // just closes it. A second Submit click then proceeds to book the deal.
    const dealerEmpty = !String(this.form.controls.dealerName.value ?? '').trim();
    if (dealerEmpty && !this.dealerNameWarned) {
      this.dealerNameWarned = true;
      this.confirm
        .confirm({
          title: 'Dealer name is empty',
          message: 'Dealer name is empty. Click Submit again to book the deal.',
          confirmText: 'Ok',
          warning: true,
          hideCancel: true,
        })
        .subscribe();
      return;
    }

    this.confirm
      .confirm({
        title: 'Submit deal?',
        message: 'Submit this deal? It will be booked on the dealing desk.',
        confirmText: 'Submit',
        icon: 'check_circle',
      })
      .subscribe((ok) => {
        // Submit → ActiveStatus "Done"; the client gets a confirmation email.
        if (ok) this.book('Done', 'Deal submitted.');
      });
  }

  private book(activeStatus: string, fallbackMessage: string): void {
    this.svc.submitBooking(this.buildBookingPayload(activeStatus)).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success(res.message || fallbackMessage);
          this.refreshQueues();
          this.clear();
        } else {
          // @Response = false → show the message, but do NOT treat as success.
          this.notify.error(res.message || 'Could not save the deal.');
        }
      },
      error: () => {},
    });
  }

  /** Build the order-booking payload (mirrors the legacy desk field set). */
  private buildBookingPayload(activeStatus: string): Record<string, string> {
    const v = this.form.getRawValue();
    const now = formatDmyTime(new Date());
    const f4 = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(4);
    const s = (x: unknown) => (x === null || x === undefined ? '' : String(x));

    const labelFor = (options: SelectOption[], value: unknown) =>
      options.find((o) => String(o.value) === String(value))?.label ?? '';

    return {
      Action: 'SUBMIT',
      RecordID: this.editingId() ?? '',
      ClientID: s(v.clientId),
      ClientName: s(v.clientName),
      ClientEmail: s(v.email),
      ClientBank: s(v.bank),
      BankName: labelFor(this.bankOptions(), v.bank),
      DealerName: s(v.dealerName),
      ImpExp: s(v.direction),
      TransactionDesc: labelFor(this.txnOptions(), v.transactionType),
      CurrencyCode: s(v.currencyPair),
      Amount: s(v.amount),
      TransactionTypeID: s(v.transactionType),
      DateSelectionType: s(v.windowFix),
      FromDate: s(v.fromDate),
      ToDate: s(v.toDate),
      MaturityDate: s(v.maturityDate),
      // Live Rates band (editable inputs; Net Rate is derived)
      BaseCurrency: f4(Number(v.liveBase) || 0),
      HomeCurrency: f4(Number(v.liveHome) || 0),
      Spot: f4(Number(v.liveSpot) || 0),
      PremiumDiscount: f4(Number(v.livePremium) || 0),
      Margin: f4(Number(v.liveMargin) || 0),
      NetRate: f4(Number(v.liveNet) || 0),
      // Dealer Rates band (manual) — the "D" set
      BaseCurrencyD: s(v.dealerBase),
      HomeCurrencyD: s(v.dealerHome),
      SpotD: s(v.spot),
      PremiumDiscountD: s(v.premium),
      MarginD: s(v.margin),
      NetRateD: f4(Number(v.dealerNet) || 0),
      // Consuming types (Forward Cancellation / Utilization) carry the parent's Booking
      // Rate from the field; other deals keep the desk convention (booking = dealer net).
      BookingRate: this.showBookingRate() ? f4(Number(v.bookingRate) || 0) : f4(Number(v.dealerNet) || 0),
      ForwardContactNo: s(v.forwardContactNo),
      // EEFC / Bill Discount / PCFC extras + Forward Cancellation outstanding (same as FTP Order Entry).
      TransactionDetail: s(v.transactionDetail),
      BillDiscount: s(v.currency2),
      OutstandingAmount: s(v.outstandingAmount),
      Remarks: s(v.remarks),
      CashSpot: '0',
      UpcomingDate: '',
      ClientRate: '0',
      ActiveStatus: activeStatus,
      LastModifiedby: this.auth.user()?.userName ?? '',
      DealerSpotTime: now,
      DealerBaseCurrencyTime: now,
      DealerHomeCurrencyTime: now,
    };
  }

  clear(): void {
    this.form.reset({
      direction: 'Export',
      currencyPair: 'USD / INR',
      transactionType: '',
      windowFix: 'Window',
      bankMargin: 0.05,
      margin: null,
      amount: 0,
      bookingRate: 0,
      outstandingAmount: 0,
      spot: 0,
      premium: 0,
      liveBase: 0,
      liveHome: 0,
      liveSpot: 0,
      livePremium: 0,
      liveMargin: 0,
      liveNet: 0,
      dealerNet: 0,
    });
    this.editingId.set(null);
    this.editingSource.set(null);
    this.dealTransactionDetail.set(null);
    this.slaDoc.set(null);
    this.authDoc.set(null);
    this.dealerNameWarned = false;
  }

  private validate(): boolean {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Please complete the required deal fields.');
      return false;
    }
    return true;
  }

  private toDeal(status: Deal['status']): Deal {
    const v = this.form.getRawValue();
    return {
      id: this.editingId() ?? this.svc.newId(),
      clientName: v.clientName,
      contactPerson: v.contactPerson,
      contactNo: v.contactNo,
      email: v.email,
      rmName: v.rmName,
      bankMargin: Number(v.bankMargin),
      direction: v.direction,
      currencyPair: v.currencyPair,
      amount: Number(v.amount),
      maturityDate: v.maturityDate,
      bank: v.bank,
      transactionType: v.transactionType,
      dealerName: v.dealerName,
      spot: Number(v.spot),
      premium: Number(v.premium),
      margin: Number(v.margin),
      netRate: Number(v.dealerNet) || this.netRate(),
      remarks: v.remarks,
      status,
      updatedAt: new Date().toISOString(),
    };
  }
}

/** Format a date as dd/MM/yyyy HH:mm:ss (the format the booking proc expects). */
function formatDmyTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/** Reads a value from a loose API record by field name, ignoring case/punctuation. */
function readField(obj: Record<string, unknown>, name: string): string | null {
  const target = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
      return v == null ? null : String(v);
    }
  }
  return null;
}

function filter(deals: Deal[], term: string): Deal[] {
  const t = term.trim().toLowerCase();
  if (!t) return deals;
  return deals.filter(
    (d) => d.clientName.toLowerCase().includes(t) || d.currencyPair.toLowerCase().includes(t),
  );
}
