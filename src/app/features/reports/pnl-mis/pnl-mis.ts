import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { PnlReportRow, PnlSection, PnlZoneReport } from '../pnl-mis.model';
import { ReportsService } from '../reports.service';

/** A report section plus its card presentation metadata. */
interface PnlSectionMeta {
  section: PnlSection;
  label: string;
  short: string;
  icon: string;
  accent: 'a' | 'b' | 'c';
}

@Component({
  selector: 'app-pnl-mis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageHeaderComponent, MatButtonModule, MatIconModule, DecimalPipe],
  templateUrl: './pnl-mis.html',
  styleUrl: './pnl-mis.scss',
})
export class PnlMisComponent {
  private readonly service = inject(ReportsService);
  private readonly notify = inject(NotificationService);

  /** To Date filter — ISO yyyy-MM-dd (native date input), defaults to today. */
  protected readonly toDate = new FormControl<string>(todayIso(), { nonNullable: true });

  protected readonly loading = signal(false);
  protected readonly report = signal<PnlZoneReport | null>(null);

  /** The three sections with presentation metadata (label / short tag / icon / accent). */
  protected readonly sectionMeta = computed<PnlSectionMeta[]>(() => {
    const r = this.report();
    if (!r) return [];
    return [
      { section: r.asOn, label: 'As on Date', short: 'As-on', icon: 'event_available', accent: 'a' },
      { section: r.mtd, label: 'Month to Date', short: 'MTD', icon: 'calendar_month', accent: 'b' },
      { section: r.ytd, label: 'Year to Date', short: 'YTD', icon: 'calendar_today', accent: 'c' },
    ];
  });

  /** Numeric cells of a row in column order (TF … Advisory, Total) for the grid. */
  protected cells(row: PnlReportRow): number[] {
    return [row.tf, row.ftp, row.moneyChange, row.retainers, row.brokerage, row.advisory, row.total];
  }

  protected generate(): void {
    const d = this.toDate.value;
    if (!d) {
      this.notify.error('Please select a To Date.');
      return;
    }
    this.loading.set(true);
    this.service
      .getPnlMis(d)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.report.set(r),
        error: () => {
          this.report.set(null);
          this.notify.error('Failed to load the report.');
        },
      });
  }

  /** Download the report as an Excel (.xls) file — same HTML-table format as the legacy export. */
  protected exportExcel(): void {
    const r = this.report();
    if (!r) return;
    const html = this.buildExcelHtml(r);
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PNLMIS_${r.toDate.replace(/-/g, '')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildExcelHtml(r: PnlZoneReport): string {
    const num = (v: number) => (v ? v.toFixed(2) : '0.00');
    const cols = 3 + r.columns.length; // Zone, Centers, RM + measures
    const th = (t: string, attrs = '') =>
      `<th style="background:#2b3a8c;color:#fff;border:1px solid #999;padding:4px" ${attrs}>${t}</th>`;
    const td = (t: string, attrs = '') => `<td style="border:1px solid #ccc;padding:4px" ${attrs}>${t}</td>`;

    let h = `<table style="border-collapse:collapse;font-family:Arial;font-size:11px">`;
    h += `<tr><td colspan="${cols}" style="border:0;font-weight:bold;font-size:14px">${r.companyName ?? ''}</td></tr>`;
    if (r.addressLine1) h += `<tr><td colspan="${cols}" style="border:0">${r.addressLine1}</td></tr>`;
    if (r.addressLine2) h += `<tr><td colspan="${cols}" style="border:0">${r.addressLine2}</td></tr>`;
    h += `<tr><td colspan="${cols}" style="border:0">PNL MIS Report &nbsp;|&nbsp; To Date: ${r.toDate} &nbsp;|&nbsp; Generated: ${r.generatedDate ?? ''}</td></tr>`;

    for (const s of [r.asOn, r.mtd, r.ytd]) {
      h += `<tr><td colspan="${cols}" style="border:0">&nbsp;</td></tr>`;
      h += `<tr><td colspan="${cols}" style="border:0;font-weight:bold">${s.title}</td></tr>`;
      h += '<tr>' + ['Zone', 'Centers', 'RM', ...r.columns].map((c) => th(c)).join('') + '</tr>';

      for (const row of s.rows) {
        const cell = (t: string, attrs = '') => td(row.kind === 'data' ? t : `<b>${t}</b>`, attrs);
        h +=
          '<tr>' +
          cell(row.zone ?? '') +
          cell(row.centers ?? '') +
          cell(row.rm ?? '') +
          cell(num(row.tf), 'align="right"') +
          cell(num(row.ftp), 'align="right"') +
          cell(num(row.moneyChange), 'align="right"') +
          cell(num(row.retainers), 'align="right"') +
          cell(num(row.brokerage), 'align="right"') +
          cell(num(row.advisory), 'align="right"') +
          cell(num(row.total), 'align="right"') +
          '</tr>';
      }

      const g = s.grandTotal;
      h +=
        '<tr>' +
        td('<b>Grand Total</b>', 'colspan="3"') +
        td(`<b>${num(g.tf)}</b>`, 'align="right"') +
        td(`<b>${num(g.ftp)}</b>`, 'align="right"') +
        td(`<b>${num(g.moneyChange)}</b>`, 'align="right"') +
        td(`<b>${num(g.retainers)}</b>`, 'align="right"') +
        td(`<b>${num(g.brokerage)}</b>`, 'align="right"') +
        td(`<b>${num(g.advisory)}</b>`, 'align="right"') +
        td(`<b>${num(g.total)}</b>`, 'align="right"') +
        '</tr>';
    }

    h += '</table>';
    return h;
  }
}

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
