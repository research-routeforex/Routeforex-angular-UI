import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { HistoricalRate } from './historical-rate-master.model';
import { HistoricalRateMasterService } from './historical-rate-master.service';

@Component({
  selector: 'app-historical-rate-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './historical-rate-master.html',
  styleUrl: './historical-rate-master.scss',
})
export class HistoricalRateMasterComponent implements OnInit {
  private readonly service = inject(HistoricalRateMasterService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  private readonly allRows = signal<HistoricalRate[]>([]);

  /** Picked Excel file (data-URL + display name); null when nothing is chosen. */
  protected readonly fileName = signal<string | null>(null);
  private readonly fileBase64 = signal<string | null>(null);

  protected readonly pageSize = signal(10);
  protected readonly pageNumber = signal(1);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** List search filters (server-side, via usp_RF_HistoricalRate_Search). */
  protected readonly searchDate = signal('');
  protected readonly searchCurrency = signal('');

  protected readonly total = computed(() => this.allRows().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly pagedRows = computed<HistoricalRate[]>(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.allRows().slice(start, start + this.pageSize());
  });
  protected readonly fromRow = computed(() =>
    this.total() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize() + 1,
  );
  protected readonly toRow = computed(() =>
    Math.min(this.pageNumber() * this.pageSize(), this.total()),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.searchDate() || null, this.searchCurrency().trim() || null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => {
        this.allRows.set(rows);
        if (this.pageNumber() > this.totalPages()) this.pageNumber.set(this.totalPages());
      });
  }

  // ---- File selection / upload ---------------------------------------------
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      this.notify.error('Please choose an Excel (.xlsx) file.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.fileName.set(file.name);
      this.fileBase64.set(reader.result as string);
    };
    reader.onerror = () => this.notify.error('Could not read the selected file.');
    reader.readAsDataURL(file);
  }

  protected upload(): void {
    const base64 = this.fileBase64();
    const name = this.fileName();
    if (!base64 || !name) {
      this.notify.error('Please choose an Excel (.xlsx) file first.');
      return;
    }

    this.uploading.set(true);
    this.service
      .upload(name, base64)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe((res) => {
        if (res.success) {
          this.notify.success(res.message || 'Historical rates uploaded.');
          this.clear();
          this.pageNumber.set(1);
          this.load();
        } else {
          this.notify.error(res.message || 'Upload failed.');
        }
      });
  }

  protected clear(): void {
    this.fileName.set(null);
    this.fileBase64.set(null);
  }

  // ---- List search / paging -------------------------------------------------
  protected setSearchDate(value: string): void {
    this.searchDate.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  protected setSearchCurrency(value: string): void {
    this.searchCurrency.set(value);
    this.pageNumber.set(1);
    this.load();
  }

  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
  }
  protected first(): void {
    this.pageNumber.set(1);
  }
  protected prev(): void {
    this.pageNumber.update((n) => Math.max(1, n - 1));
  }
  protected next(): void {
    this.pageNumber.update((n) => Math.min(this.totalPages(), n + 1));
  }
  protected last(): void {
    this.pageNumber.set(this.totalPages());
  }
}
