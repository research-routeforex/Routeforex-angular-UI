import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { ReportUcRow } from '../report-uc.model';
import { ReportsService } from '../reports.service';

interface Col {
  key: keyof ReportUcRow;
  label: string;
  type: 'text' | 'amt' | 'rate';
}

const COLUMNS: Col[] = [
  { key: 'rowNumber', label: 'Sl.', type: 'text' },
  { key: 'transactionType', label: 'Transaction Type', type: 'text' },
  { key: 'bookingDate', label: 'Booking Date', type: 'text' },
  { key: 'bankName', label: 'Bank', type: 'text' },
  { key: 'currency', label: 'Currency', type: 'text' },
  { key: 'importExport', label: 'Imp/Exp', type: 'text' },
  { key: 'forwardContractAmount', label: 'FC Amount', type: 'amt' },
  { key: 'forwardContractRateBooked', label: 'FC Rate Booked', type: 'rate' },
  { key: 'maturityDate', label: 'Maturity Date', type: 'text' },
  { key: 'utilizedAmount', label: 'Utilized Amount', type: 'amt' },
  { key: 'utilizedDate', label: 'Utilized Date', type: 'text' },
  { key: 'edcCharge', label: 'EDC Charge', type: 'rate' },
  { key: 'finalRate', label: 'Final Rate', type: 'rate' },
  { key: 'cancellationRate', label: 'Cancellation Rate', type: 'rate' },
  { key: 'spot', label: 'Spot', type: 'rate' },
  { key: 'premiumCashSpot', label: 'Premium/Cash Spot', type: 'rate' },
  { key: 'washRate', label: 'Wash Rate', type: 'rate' },
  { key: 'spotClosingRate', label: 'Spot Closing Rate', type: 'rate' },
  { key: 'originalValue', label: 'Original Value', type: 'amt' },
  { key: 'rate', label: 'Rate', type: 'rate' },
  { key: 'profitLoss', label: 'Profit / Loss', type: 'amt' },
];

@Component({
  selector: 'app-report-uc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageHeaderComponent, SelectComponent, MatButtonModule, MatIconModule],
  templateUrl: './report-uc.html',
  styleUrl: './report-uc.scss',
})
export class ReportUcComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ReportsService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly columns = COLUMNS;

  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly txnOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: 'Utilization', label: 'Utilization' },
    { value: 'Cancellation', label: 'Cancellation' },
  ];
  protected readonly impExpOptions: SelectOption[] = [
    { value: '', label: 'All' },
    { value: 'Import', label: 'Import' },
    { value: 'Export', label: 'Export' },
  ];

  protected readonly form = this.fb.group({
    clientId: this.fb.control<number | null>(null),
    transactionType: this.fb.control<string>(''),
    importExport: this.fb.control<string>(''),
  });

  protected readonly loading = signal(false);
  protected readonly rows = signal<ReportUcRow[] | null>(null);

  /** Free-text grid search — matches any column's displayed value. */
  protected readonly search = signal('');

  /** Columns that carry a per-column search box in the header. */
  private readonly filterableKeys: (keyof ReportUcRow)[] = [
    'transactionType',
    'bankName',
    'currency',
    'importExport',
  ];
  /** Per-column search terms (Transaction Type / Bank / Currency / Imp-Exp). */
  protected readonly colFilters = signal<Partial<Record<keyof ReportUcRow, string>>>({});

  protected isFilterable(col: Col): boolean {
    return this.filterableKeys.includes(col.key);
  }

  protected setColFilter(key: keyof ReportUcRow, value: string): void {
    this.colFilters.update((f) => ({ ...f, [key]: value }));
  }

  /** Rows after applying the global + per-column search (drives grid, footer, export). */
  protected readonly filteredRows = computed<ReportUcRow[]>(() => {
    const rows = this.rows() ?? [];
    const term = this.search().trim().toLowerCase();
    const cf = this.colFilters();

    return rows.filter((r) => {
      // Global search across every displayed column.
      if (term && !this.columns.some((c) => this.format(c, r).toLowerCase().includes(term))) {
        return false;
      }
      // Per-column filters.
      for (const key of this.filterableKeys) {
        const fv = (cf[key] ?? '').trim().toLowerCase();
        if (fv && !String(r[key] ?? '').toLowerCase().includes(fv)) return false;
      }
      return true;
    });
  });

  /** Column totals for the amount columns (summed across the filtered rows). */
  protected readonly totals = computed<Partial<Record<keyof ReportUcRow, number>>>(() => {
    const rows = this.filteredRows();
    const t: Partial<Record<keyof ReportUcRow, number>> = {};
    for (const c of this.columns) {
      if (c.type !== 'amt') continue;
      let sum = 0;
      for (const r of rows) sum += Number(r[c.key]) || 0;
      t[c.key] = sum;
    }
    return t;
  });

  /** Selected client's label (for the export title); reads the form value on demand. */
  protected clientName(): string {
    const id = this.form.controls.clientId.value;
    return this.clientOptions().find((o) => Number(o.value) === Number(id))?.label ?? 'All clients';
  }

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
  }

  protected generate(): void {
    const { clientId, transactionType, importExport } = this.form.getRawValue();
    this.search.set('');
    this.loading.set(true);
    this.service
      .getReportUc({
        clientId: clientId ?? null,
        transactionType: transactionType || null,
        importExport: importExport || null,
      })
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
  protected format(col: Col, row: ReportUcRow): string {
    const v = row[col.key];
    if (v === null || v === undefined || v === '') return col.type === 'text' ? '—' : '';
    if (col.type === 'text') return String(v);
    const max = col.type === 'amt' ? 2 : 5;
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
    h += `<tr><td colspan="${this.columns.length}" style="border:0;font-weight:bold">Report UC — ${this.clientName()}</td></tr>`;
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
    a.download = 'ReportUC.xls';
    a.click();
    URL.revokeObjectURL(url);
  }
}
