import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../shared/date/dmy-date-adapter';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DropdownService } from '../../shared/services/dropdown.service';
import { InvoiceLine } from './invoice.model';
import { InvoiceService } from './invoice.service';

/** GST applied to the charges (CGST 9% + SGST 9%). */
const GST_RATE = 0.18;

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
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  // Company details for the invoice header/footer.
  protected readonly company = {
    name: 'RouteForex Solutions Pvt. Ltd.',
    tagline: 'Bringing Transparency Adding Bottomline',
    logo: 'invoice/logo.jpg',
    stamp: 'invoice/stamp.jpg',
  };

  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly lines = signal<InvoiceLine[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);

  // Invoice (set after "Generate Invoice").
  protected readonly generating = signal(false);
  protected readonly generated = signal(false);
  protected readonly invoiceNo = signal('');
  protected readonly invoiceDate = signal<Date>(new Date());

  protected readonly form = this.fb.group({
    client: this.fb.control<number | null>(null, [Validators.required]),
    fromDate: this.fb.control<Date | null>(null, [Validators.required]),
    toDate: this.fb.control<Date | null>(null, [Validators.required]),
  });

  protected readonly totalValue = computed(() =>
    this.lines().reduce((s, l) => s + (l.amount ?? 0), 0),
  );
  protected readonly totalCharges = computed(() =>
    this.lines().reduce((s, l) => s + (l.charge ?? 0), 0),
  );
  protected readonly gst = computed(() => this.totalCharges() * GST_RATE);
  protected readonly grandTotal = computed(() => this.totalCharges() + this.gst());

  /** Client name for the invoice (from rows, else the picked option). */
  protected readonly clientName = computed(() => {
    const fromRows = this.lines()[0]?.clientName;
    if (fromRows) return fromRows;
    const id = this.form.controls.client.value;
    return this.clientOptions().find((o) => Number(o.value) === id)?.label ?? '';
  });

  constructor() {
    this.dropdowns.get('Client').subscribe((opts) => this.clientOptions.set(opts));
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

  /** Generate the invoice: mark orders InvoiceGenerated, then show the document. */
  protected generateInvoice(): void {
    if (!this.lines().length || this.generating()) return;
    const { client, fromDate, toDate } = this.form.getRawValue();

    this.confirm
      .confirm({
        title: 'Generate invoice?',
        message: `This will mark ${this.lines().length} order(s) as invoiced (ActiveStatus = InvoiceGenerated).`,
        confirmText: 'Generate',
        icon: 'receipt_long',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.generating.set(true);
        this.service
          .markGenerated(client!, toIso(fromDate!), toIso(toDate!))
          .pipe(finalize(() => this.generating.set(false)))
          .subscribe(() => {
            this.invoiceDate.set(new Date());
            this.invoiceNo.set(this.buildInvoiceNo(client!));
            this.generated.set(true);
            this.notify.success('Invoice generated.');
          });
      });
  }

  /** e.g. RF/INV/2026/000162-3741 */
  private buildInvoiceNo(clientId: number): string {
    const d = this.invoiceDate();
    const seq = String(Math.floor(d.getTime() / 1000) % 10000).padStart(4, '0');
    return `RF/INV/${d.getFullYear()}/${String(clientId).padStart(6, '0')}-${seq}`;
  }

  protected print(): void {
    window.print();
  }
}

/** Date -> yyyy-MM-dd (local). */
function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
