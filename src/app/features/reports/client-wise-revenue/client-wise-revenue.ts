import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ClientWiseRevenueReport } from '../client-wise-revenue.model';
import { ReportsService } from '../reports.service';

/** Totals row (monthly grand totals per category, computed client-side from the rows). */
interface Footer {
  months: number[][];
  categoryTotals: number[];
  total: number;
}

@Component({
  selector: 'app-client-wise-revenue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageHeaderComponent, SelectComponent, MatButtonModule, MatIconModule, DecimalPipe],
  templateUrl: './client-wise-revenue.html',
  styleUrl: './client-wise-revenue.scss',
})
export class ClientWiseRevenueComponent {
  private readonly service = inject(ReportsService);
  private readonly notify = inject(NotificationService);

  protected readonly faYears: SelectOption[] = buildFinancialYears();
  protected readonly fyControl = new FormControl<string>(this.faYears[0].value as string, {
    nonNullable: true,
  });

  protected readonly loading = signal(false);
  protected readonly report = signal<ClientWiseRevenueReport | null>(null);

  /** Totals row: sum every client's value per month/category + category totals + grand total. */
  protected readonly footer = computed<Footer | null>(() => {
    const r = this.report();
    if (!r || !r.rows.length) return null;

    const months = r.months.map(() => r.categories.map(() => 0));
    const categoryTotals = r.categories.map(() => 0);
    let total = 0;

    for (const row of r.rows) {
      for (let m = 0; m < months.length; m++) {
        for (let c = 0; c < categoryTotals.length; c++) {
          const v = row.months[m]?.[c] ?? 0;
          months[m][c] += v;
          categoryTotals[c] += v;
          total += v;
        }
      }
    }
    return { months, categoryTotals, total };
  });

  protected generate(): void {
    const fy = this.fyControl.value;
    if (!fy) return;
    this.loading.set(true);
    this.service
      .getClientWiseRevenue(fy)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.report.set(r),
        error: () => {
          this.report.set(null);
          this.notify.error('Failed to load the report.');
        },
      });
  }

  /** Download the current report as an Excel (.xls) file — same HTML-table format as the legacy export. */
  protected exportExcel(): void {
    const r = this.report();
    if (!r) return;
    const html = this.buildExcelHtml(r);
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClientWiseRevenue_${r.faYear}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildExcelHtml(r: ClientWiseRevenueReport): string {
    const f = this.footer();
    const num = (v: number) => (v ? v.toFixed(2) : '0.00');
    const totalCols = 4 + r.months.length * r.categories.length + r.categories.length + 1;

    const th = (t: string, attrs = '') =>
      `<th style="background:#2b3a8c;color:#fff;border:1px solid #999;padding:4px" ${attrs}>${t}</th>`;
    const td = (t: string, attrs = '') => `<td style="border:1px solid #ccc;padding:4px" ${attrs}>${t}</td>`;

    let h = `<table style="border-collapse:collapse;font-family:Arial;font-size:11px">`;

    // Title block.
    h += `<tr><td colspan="${totalCols}" style="border:0;font-weight:bold;font-size:14px">${r.companyName ?? ''}</td></tr>`;
    if (r.addressLine1) h += `<tr><td colspan="${totalCols}" style="border:0">${r.addressLine1}</td></tr>`;
    if (r.addressLine2) h += `<tr><td colspan="${totalCols}" style="border:0">${r.addressLine2}</td></tr>`;
    h += `<tr><td colspan="${totalCols}" style="border:0">Client Wise Revenue Report &nbsp; | &nbsp; FY ${r.faYear} &nbsp; | &nbsp; Generated: ${r.generatedDate ?? ''}</td></tr>`;
    h += `<tr><td colspan="${totalCols}" style="border:0">&nbsp;</td></tr>`;

    // Header rows.
    h += '<tr>';
    h += th('Sl. No.', 'rowspan="2"') + th('Client Name', 'rowspan="2"') + th('Zone', 'rowspan="2"') + th('RM', 'rowspan="2"');
    for (const m of r.months) h += th(m, `colspan="${r.categories.length}"`);
    h += th('Total', `colspan="${r.categories.length}"`) + th('Grand Total', 'rowspan="2"');
    h += '</tr><tr>';
    for (let i = 0; i <= r.months.length; i++) for (const c of r.categories) h += th(c);
    h += '</tr>';

    // Body.
    for (const row of r.rows) {
      h += '<tr>';
      h += td(String(row.slNo)) + td(row.clientName ?? '') + td(row.zone ?? '') + td(row.rm ?? '');
      for (const month of row.months) for (const v of month) h += td(num(v), 'align="right"');
      for (const v of row.categoryTotals) h += td(num(v), 'align="right"');
      h += td(num(row.total), 'align="right"');
      h += '</tr>';
    }

    // Totals footer.
    if (f) {
      h += '<tr>';
      h += td('<b>Grand Total</b>', 'colspan="4"');
      for (const month of f.months) for (const v of month) h += td(`<b>${num(v)}</b>`, 'align="right"');
      for (const v of f.categoryTotals) h += td(`<b>${num(v)}</b>`, 'align="right"');
      h += td(`<b>${num(f.total)}</b>`, 'align="right"');
      h += '</tr>';
    }

    h += '</table>';
    return h;
  }
}

/** Financial years (April→March) — current FY down to seven prior years. */
function buildFinancialYears(): SelectOption[] {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const opts: SelectOption[] = [];
  for (let y = startYear; y >= startYear - 7; y--) {
    const label = `${y}-${y + 1}`;
    opts.push({ value: label, label });
  }
  return opts;
}
