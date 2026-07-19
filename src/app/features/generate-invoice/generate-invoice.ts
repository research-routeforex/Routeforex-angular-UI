import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ConfirmService } from '../../shared/services/confirm.service';
import { DropdownService } from '../../shared/services/dropdown.service';
import { CompanyMasterService } from '../company-master/company-master.service';
import { GeneratedInvoice, InvoiceFooter, InvoiceLine, SaveInvoiceResult } from './invoice.model';
import { InvoiceService } from './invoice.service';

type InvoiceTab = 'generate' | 'history';

interface HistFilters {
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  totalAmount: string;
  charges: string;
  sgst: string;
  cgst: string;
  igst: string;
}

@Component({
  selector: 'app-generate-invoice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule,
    DecimalPipe,
    DatePipe,
  ],
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './generate-invoice.html',
  styleUrl: './generate-invoice.scss',
})
export class GenerateInvoiceComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InvoiceService);
  private readonly dropdowns = inject(DropdownService);
  private readonly companies = inject(CompanyMasterService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  // Company details for the invoice header/footer.
  protected readonly company = {
    name: 'RouteForex Solutions Pvt. Ltd.',
    tagline: 'Bringing Transparency Adding Bottomline',
    logo: 'invoice/logo.jpg',
    stamp: 'invoice/stamp.jpg',
  };

  protected readonly tabs: { key: InvoiceTab; label: string; icon: string }[] = [
    { key: 'generate', label: 'Generate Invoice', icon: 'receipt_long' },
    { key: 'history', label: 'Generated Invoices', icon: 'history' },
  ];
  protected readonly active = signal<InvoiceTab>('generate');
  protected select(key: InvoiceTab): void {
    this.active.set(key);
  }

  protected readonly clientOptions = signal<SelectOption[]>([]);
  /** GST numbers sourced from TPO_Mast_CompanyMaster.GSTN (distinct, non-blank). */
  protected readonly gstnOptions = signal<SelectOption[]>([]);
  protected readonly lines = signal<InvoiceLine[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);

  // Invoice (set after "Generate Invoice").
  protected readonly generating = signal(false);
  protected readonly generated = signal(false);
  protected readonly invoiceNo = signal('');
  protected readonly invoiceDate = signal<Date>(new Date());
  protected readonly gstNumber = signal('');
  /** Billing period shown on the printable invoice (search range, or rebuilt on re-print). */
  protected readonly periodFrom = signal<Date | null>(null);
  protected readonly periodTo = signal<Date | null>(null);
  /** Server-computed tax breakdown (set after Generate) — drives the invoice split. */
  protected readonly tax = signal<SaveInvoiceResult | null>(null);
  /** Which tax applies — inter-state IGST, or intra-state CGST + SGST. */
  protected readonly taxMode = computed<'igst' | 'split'>(() => {
    const t = this.tax();
    const k = (t?.taxType ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    if (k === 'IGST') return 'igst';
    if (k.includes('CGST') || k.includes('SGST')) return 'split';
    return (t?.igst ?? 0) > 0 && (t?.cgst ?? 0) === 0 && (t?.sgst ?? 0) === 0 ? 'igst' : 'split';
  });
  /** Bank + contact details bound in the invoice footer. */
  protected readonly footer = signal<InvoiceFooter | null>(null);

  protected readonly form = this.fb.group({
    client: this.fb.control<number | null>(null, [Validators.required]),
    fromDate: this.fb.control<Date | null>(null, [Validators.required]),
    toDate: this.fb.control<Date | null>(null, [Validators.required]),
  });

  /** Invoice header inputs — validated before "Generate Invoice". */
  protected readonly invForm = this.fb.group({
    gstNumber: this.fb.control<string | null>(null, [Validators.required]),
    invoiceNumber: this.fb.nonNullable.control('', [Validators.required]),
    invoiceDate: this.fb.control<Date | null>(new Date(), [Validators.required]),
  });

  // ---- Generated Invoices (history) ---------------------------------------
  protected readonly history = signal<GeneratedInvoice[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly historySearched = signal(false);

  /** History search — client optional (empty = all clients). */
  protected readonly histForm = this.fb.group({
    client: this.fb.control<number | null>(null),
    fromDate: this.fb.control<Date | null>(null, [Validators.required]),
    toDate: this.fb.control<Date | null>(null, [Validators.required]),
  });

  // Per-column filters + pagination for the history grid (Client Master style).
  protected readonly histFilters = signal<HistFilters>({
    invoiceNumber: '',
    invoiceDate: '',
    clientName: '',
    totalAmount: '',
    charges: '',
    sgst: '',
    cgst: '',
    igst: '',
  });
  protected readonly histPageSize = signal(10);
  protected readonly histPageNumber = signal(1);
  protected readonly histPageSizeOptions = [10, 20, 50, 100];

  protected readonly filteredHistory = computed<GeneratedInvoice[]>(() => {
    const f = this.histFilters();
    return this.history().filter(
      (r) =>
        has(r.invoiceNumber, f.invoiceNumber) &&
        has(fmtDate(r.invoiceGeneratedDate), f.invoiceDate) &&
        has(r.clientName, f.clientName) &&
        has(num(r.totalAmount), f.totalAmount) &&
        has(num(r.charges), f.charges) &&
        has(num(r.sgst), f.sgst) &&
        has(num(r.cgst), f.cgst) &&
        has(num(r.igst), f.igst),
    );
  });
  protected readonly histTotal = computed(() => this.filteredHistory().length);
  protected readonly histTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.histTotal() / this.histPageSize())),
  );
  protected readonly histPaged = computed<GeneratedInvoice[]>(() => {
    const start = (this.histPageNumber() - 1) * this.histPageSize();
    return this.filteredHistory().slice(start, start + this.histPageSize());
  });
  protected readonly histFromRow = computed(() =>
    this.histTotal() === 0 ? 0 : (this.histPageNumber() - 1) * this.histPageSize() + 1,
  );
  protected readonly histToRow = computed(() =>
    Math.min(this.histPageNumber() * this.histPageSize(), this.histTotal()),
  );

  // Column totals across the filtered set (not just the current page).
  private histSum(pick: (r: GeneratedInvoice) => number): number {
    return this.filteredHistory().reduce((s, r) => s + (pick(r) ?? 0), 0);
  }
  protected readonly histTotalAmount = computed(() => this.histSum((r) => r.totalAmount));
  protected readonly histTotalCharges = computed(() => this.histSum((r) => r.charges));
  protected readonly histTotalSgst = computed(() => this.histSum((r) => r.sgst));
  protected readonly histTotalCgst = computed(() => this.histSum((r) => r.cgst));
  protected readonly histTotalIgst = computed(() => this.histSum((r) => r.igst));

  protected readonly totalValue = computed(() =>
    this.lines().reduce((s, l) => s + (l.amount ?? 0), 0),
  );
  protected readonly totalCharges = computed(() =>
    this.lines().reduce((s, l) => s + (l.charge ?? 0), 0),
  );
  /** Grand total from the server breakdown once generated, else the charges subtotal. */
  protected readonly grandTotal = computed(() => this.tax()?.totalAmount ?? this.totalCharges());
  /** Round the payable to the nearest rupee; the difference is shown as "Round Off". */
  protected readonly roundedTotal = computed(() => Math.round(this.grandTotal()));
  protected readonly roundOff = computed(() => this.roundedTotal() - this.grandTotal());

  /** Client name for the invoice (from rows, else the picked option). */
  protected readonly clientName = computed(() => {
    const fromRows = this.lines()[0]?.clientName;
    if (fromRows) return fromRows;
    const id = this.form.controls.client.value;
    return this.clientOptions().find((o) => Number(o.value) === id)?.label ?? '';
  });

  constructor() {
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
    this.service.getFooter().subscribe((f) => this.footer.set(f));

    // GST-number dropdown from company master — Active companies only, distinct non-blank GSTN.
    this.companies.getCompanies().subscribe((list) => {
      const seen = new Set<string>();
      const opts: SelectOption[] = [];
      for (const c of list) {
        if (c.activeStatus !== 'Active') continue;
        const g = (c.gstn ?? '').trim();
        if (!g || seen.has(g.toLowerCase())) continue;
        seen.add(g.toLowerCase());
        opts.push({ value: g, label: g });
      }
      opts.sort((a, b) => a.label.localeCompare(b.label));
      this.gstnOptions.set(opts);
    });
  }

  protected search(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      this.notify.error('Select a client and a date range.');
      return;
    }
    const { client, fromDate, toDate } = this.form.getRawValue();
    if (toDate! < fromDate!) {
      this.notify.error('"To" date cannot be before "From" date.');
      return;
    }

    this.loading.set(true);
    this.generated.set(false);
    this.service
      .generate(client!, toIso(fromDate!), toIso(toDate!))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.lines.set(rows);
        this.searched.set(true);
      });
  }

  /** Generate the invoice: validate header inputs, persist header + details, show the document. */
  protected generateInvoice(): void {
    if (!this.lines().length || this.generating()) return;

    // Invoice number, invoice date and GST number cannot be blank/null.
    if (this.invForm.invalid) {
      this.invForm.markAllAsTouched();
      this.notify.error('Enter GST number, invoice number and invoice date.');
      return;
    }

    const { client } = this.form.getRawValue();
    const { gstNumber, invoiceNumber, invoiceDate } = this.invForm.getRawValue();

    this.confirm
      .confirm({
        title: 'Generate invoice?',
        message: `This will bill ${this.lines().length} order(s) and mark them as invoiced.`,
        confirmText: 'Generate',
        icon: 'receipt_long',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.generating.set(true);
        this.service
          .saveInvoice({
            clientId: client!,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate: toIso(invoiceDate!),
            gstNumber: gstNumber!,
            charges: round2(this.totalCharges()),
            orderIds: this.lines().map((l) => l.recordId),
          })
          .pipe(finalize(() => this.generating.set(false)))
          .subscribe((result) => {
            this.tax.set(result);
            this.invoiceNo.set(invoiceNumber.trim());
            this.invoiceDate.set(invoiceDate!);
            this.gstNumber.set(gstNumber!);
            const range = this.form.getRawValue();
            this.periodFrom.set(range.fromDate ?? null);
            this.periodTo.set(range.toDate ?? null);
            this.generated.set(true);
            this.notify.success('Invoice generated.');
          });
      });
  }

  protected print(): void {
    window.print();
  }

  // ---- Generated Invoices (history) ---------------------------------------
  protected searchHistory(): void {
    if (this.histForm.invalid || this.historyLoading()) {
      this.histForm.markAllAsTouched();
      this.notify.error('Select a date range.');
      return;
    }
    const { client, fromDate, toDate } = this.histForm.getRawValue();
    if (toDate! < fromDate!) {
      this.notify.error('"To" date cannot be before "From" date.');
      return;
    }

    this.historyLoading.set(true);
    this.service
      .getGeneratedInvoices(toIso(fromDate!), toIso(toDate!), client)
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe((rows) => {
        this.history.set(rows);
        this.historySearched.set(true);
        this.histPageNumber.set(1);
      });
  }

  protected setHistFilter(key: keyof HistFilters, value: string): void {
    this.histFilters.update((f) => ({ ...f, [key]: value }));
    this.histPageNumber.set(1);
  }
  protected onHistPageSize(value: string | number): void {
    this.histPageSize.set(Number(value));
    this.histPageNumber.set(1);
  }
  protected histFirst(): void {
    this.histPageNumber.set(1);
  }
  protected histPrev(): void {
    this.histPageNumber.update((n) => Math.max(1, n - 1));
  }
  protected histNext(): void {
    this.histPageNumber.update((n) => Math.min(this.histTotalPages(), n + 1));
  }
  protected histLast(): void {
    this.histPageNumber.set(this.histTotalPages());
  }

  /** Open the saved invoice as a standalone printable page in a new browser tab. */
  protected printInvoice(row: GeneratedInvoice): void {
    window.open(`/invoice/print/${row.invoiceHdrId}`, '_blank');
  }

  /** E-mail the saved invoice to the client's contact address(es). */
  protected emailInvoice(row: GeneratedInvoice): void {
    this.service.emailInvoice(row.invoiceHdrId).subscribe((count) => {
      this.notify.success(`Invoice ${row.invoiceNumber ?? ''} e-mailed to ${count} recipient(s).`);
    });
  }
}

/** Case-insensitive "contains" filter helper. */
function has(value: string | null | undefined, term: string): boolean {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** ISO date -> dd-MMM-yyyy (so the column filter matches the displayed text). */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}
/** Number -> string for filtering (empty for null). */
function num(n: number | null | undefined): string {
  return n == null ? '' : String(n);
}

/** Round to 2 decimals. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Date -> yyyy-MM-dd (local). */
function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
