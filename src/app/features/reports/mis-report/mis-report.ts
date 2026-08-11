import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../../shared/date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../../shared/directives/open-datepicker-on-focus.directive';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { MisReportRow } from '../mis-report.model';
import { ReportsService } from '../reports.service';

interface Col {
  key: keyof MisReportRow;
  label: string;
  type: 'text' | 'amt' | 'rate';
}

const COLUMNS: Col[] = [
  { key: 'rowNumber', label: 'Sl.', type: 'text' },
  { key: 'date', label: 'Date', type: 'text' },
  { key: 'timeOut', label: 'Time Out', type: 'text' },
  { key: 'clientName', label: 'Client Name', type: 'text' },
  { key: 'contactPerson', label: 'Contact Person', type: 'text' },
  { key: 'bankName', label: 'Bank Name', type: 'text' },
  { key: 'branch', label: 'Branch', type: 'text' },
  { key: 'dealerName', label: 'Dealer Name', type: 'text' },
  { key: 'transTypeName', label: 'Trans Type', type: 'text' },
  { key: 'maturityType', label: 'Maturity Type', type: 'text' },
  { key: 'currency', label: 'Currency', type: 'text' },
  { key: 'transactionAmount', label: 'Txn Amount', type: 'amt' },
  { key: 'interBankRate', label: 'Inter Bank Rate', type: 'rate' },
  { key: 'forwardPremiumCashSpot', label: 'Fwd Prem / Cash Spot', type: 'rate' },
  { key: 'bankCommissionPaisa', label: 'Bank Comm (Paisa)', type: 'rate' },
  { key: 'fixedAmountWithBank', label: 'Fixed Amt With Bank', type: 'rate' },
  { key: 'amountInInr', label: 'Amount in INR', type: 'amt' },
  { key: 'maturityDate', label: 'Maturity Date', type: 'text' },
  { key: 'transactionDetail', label: 'Txn Detail', type: 'text' },
  { key: 'ourCommission', label: 'Our Commission', type: 'amt' },
  { key: 'revenue', label: 'Revenue', type: 'amt' },
  { key: 'region', label: 'Region', type: 'text' },
  { key: 'zone', label: 'Zone', type: 'text' },
];

@Component({
  selector: 'app-mis-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    OpenDatepickerOnFocusDirective,
  ],
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './mis-report.html',
  styleUrl: './mis-report.scss',
})
export class MisReportComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReportsService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly columns = COLUMNS;
  protected readonly clientOptions = signal<SelectOption[]>([]);

  protected readonly form = this.fb.group({
    fromDate: this.fb.control<Date | null>(null, [Validators.required]),
    toDate: this.fb.control<Date | null>(null, [Validators.required]),
    clientId: this.fb.control<number | null>(null),
  });

  protected readonly loading = signal(false);
  protected readonly rows = signal<MisReportRow[] | null>(null);

  /** Free-text grid search — matches any column's displayed value. */
  protected readonly search = signal('');

  /** Rows after applying the search (drives grid, footer, export). */
  protected readonly filteredRows = computed<MisReportRow[]>(() => {
    const rows = this.rows() ?? [];
    const term = this.search().trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      this.columns.some((c) => this.format(c, r).toLowerCase().includes(term)),
    );
  });

  /** Column totals for the amount columns (summed across the filtered rows). */
  protected readonly totals = computed<Partial<Record<keyof MisReportRow, number>>>(() => {
    const rows = this.filteredRows();
    const t: Partial<Record<keyof MisReportRow, number>> = {};
    for (const c of this.columns) {
      if (c.type !== 'amt') continue;
      let sum = 0;
      for (const r of rows) sum += Number(r[c.key]) || 0;
      t[c.key] = sum;
    }
    return t;
  });

  /** Selected client's label (for the export title). */
  protected clientName(): string {
    const id = this.form.controls.clientId.value;
    return this.clientOptions().find((o) => Number(o.value) === Number(id))?.label ?? 'All clients';
  }

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
  }

  protected generate(): void {
    if (this.form.controls.fromDate.invalid || this.form.controls.toDate.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Select a From and To date.');
      return;
    }
    const { fromDate, toDate, clientId } = this.form.getRawValue();
    if (toDate! < fromDate!) {
      this.notify.error('"To" date cannot be before "From" date.');
      return;
    }

    this.search.set('');
    this.loading.set(true);
    this.service
      .getMisReport({ fromDate: toIso(fromDate!), toDate: toIso(toDate!), clientId: clientId ?? null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.rows.set(r),
        error: () => {
          this.rows.set(null);
          this.notify.error('Failed to load the report.');
        },
      });
  }

  /** Format a cell value for a column (used by both the grid and the Excel export). */
  protected format(col: Col, row: MisReportRow): string {
    const v = row[col.key];
    if (v === null || v === undefined || v === '') return col.type === 'text' ? '—' : '';
    if (col.type === 'text') return String(v);
    const max = col.type === 'amt' ? 2 : 4;
    return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: max });
  }

  protected isNum(col: Col): boolean {
    return col.type !== 'text';
  }

  /** Formatted column total (amount columns only). */
  protected totalFmt(col: Col): string {
    if (col.type !== 'amt') return '';
    const sum = this.totals()[col.key] ?? 0;
    return sum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Download the current (searched) result as an Excel (.xls) file (HTML-table format). */
  protected exportExcel(): void {
    const rows = this.filteredRows();
    if (!rows.length) return;
    const th = (t: string) =>
      `<th style="background:#2b3a8c;color:#fff;border:1px solid #999;padding:4px">${t}</th>`;
    const td = (t: string, num: boolean) =>
      `<td style="border:1px solid #ccc;padding:4px" ${num ? 'align="right"' : ''}>${t}</td>`;

    let h = `<table style="border-collapse:collapse;font-family:Arial;font-size:11px">`;
    h += `<tr><td colspan="${this.columns.length}" style="border:0;font-weight:bold">MIS Report — ${this.clientName()}</td></tr>`;
    h += '<tr>' + this.columns.map((c) => th(c.label)).join('') + '</tr>';
    for (const row of rows) {
      h += '<tr>' + this.columns.map((c) => td(this.format(c, row), this.isNum(c))).join('') + '</tr>';
    }
    // Totals row (amount columns).
    h += '<tr>' + this.columns
      .map((c, i) => {
        if (i === 0) return td('<b>Total</b>', false);
        return c.type === 'amt' ? td('<b>' + this.totalFmt(c) + '</b>', true) : td('', false);
      })
      .join('') + '</tr>';
    h += '</table>';

    const blob = new Blob(['﻿' + h], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MISReport.xls';
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Date -> yyyy-MM-dd (local). */
function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
