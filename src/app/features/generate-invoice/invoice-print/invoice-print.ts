import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { InvoiceDocument, InvoiceFooter } from '../invoice.model';
import { InvoiceService } from '../invoice.service';

/**
 * Standalone, printable invoice page (opened in a new tab from the history grid).
 * Renders the same document as the Generate flow for a saved InvoiceHdrID.
 */
@Component({
  selector: 'app-invoice-print',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, DecimalPipe, DatePipe],
  templateUrl: './invoice-print.html',
  styleUrl: './invoice-print.scss',
})
export class InvoicePrintComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(InvoiceService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly company = {
    name: 'RouteForex Solutions Pvt. Ltd.',
    tagline: 'Bringing Transparency Adding Bottomline',
    logo: 'invoice/logo.jpg',
    stamp: 'invoice/stamp.jpg',
  };

  protected readonly loading = signal(true);
  protected readonly doc = signal<InvoiceDocument | null>(null);
  protected readonly footer = signal<InvoiceFooter | null>(null);

  protected readonly header = computed(() => this.doc()?.header ?? null);
  protected readonly lines = computed(() => this.doc()?.lines ?? []);
  protected readonly companyInfo = computed(() => this.doc()?.company ?? null);
  protected readonly grandTotal = computed(() => this.header()?.totalAmount ?? 0);
  protected readonly roundedTotal = computed(() => Math.round(this.grandTotal()));
  protected readonly roundOff = computed(() => this.roundedTotal() - this.grandTotal());

  /** Which tax applies — inter-state IGST, or intra-state CGST + SGST. */
  protected readonly taxMode = computed<'igst' | 'split'>(() => {
    const h = this.header();
    const t = (h?.taxType ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    if (t === 'IGST') return 'igst';
    if (t.includes('CGST') || t.includes('SGST')) return 'split';
    // Fallback when taxType is missing: infer from the amounts.
    return (h?.igst ?? 0) > 0 && (h?.cgst ?? 0) === 0 && (h?.sgst ?? 0) === 0 ? 'igst' : 'split';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || Number.isNaN(id)) {
      this.loading.set(false);
      return;
    }
    forkJoin({
      doc: this.service.getInvoice(id),
      footer: this.service.getFooter(),
    }).subscribe({
      next: ({ doc, footer }) => {
        this.doc.set(doc);
        this.footer.set(footer);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected print(): void {
    window.print();
  }

  /**
   * Scale the invoice so it always fits on a single A4 page when printed.
   * Runs for both the Print button and Ctrl+P (via the beforeprint event).
   * We estimate the printed height at A4 width and set a `zoom` factor (zoom —
   * unlike transform:scale — actually reduces the height used for pagination).
   */
  @HostListener('window:beforeprint')
  protected fitToOnePage(): void {
    const inv = (this.host.nativeElement as HTMLElement).querySelector('.inv') as HTMLElement | null;
    if (!inv) return;

    const PRINT_W = 794; // full A4 width  @96dpi (zero page margin)
    const PRINT_H = 1123; // full A4 height @96dpi (zero page margin)

    const w = inv.offsetWidth || PRINT_W;
    const h = inv.offsetHeight;
    if (!h) return;

    // Height reflows roughly proportionally to width when narrowed to the page.
    const estPrintHeight = h * (PRINT_W / w);
    const zoom = Math.min(1, (PRINT_H / estPrintHeight) * 0.97);
    document.documentElement.style.setProperty('--print-zoom', zoom.toFixed(3));
  }
}
