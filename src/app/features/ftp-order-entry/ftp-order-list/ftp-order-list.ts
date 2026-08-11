import { DatePipe, DecimalPipe } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { emptyPage, PagedResult } from '../../../core/models/pagination.model';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { OrderRecording, RecordingType } from '../order-documents/order-recording.model';
import { OrderRecordingService } from '../order-documents/order-recording.service';
import { FTP_ORDER_CONFIG, FtpOrderListItem, OrderScreenConfig } from '../ftp-order.model';
import { FtpOrderService } from '../ftp-order.service';

interface OrderFilters {
  orderNumber: string;
  client: string;
  transactionType: string;
  impExp: string;
  currency: string;
  amount: string;
  maturity: string;
  status: string;
  createdDateTime: string;
}

@Component({
  selector: 'app-ftp-order-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './ftp-order-list.html',
  styleUrl: './ftp-order-list.scss',
})
export class FtpOrderListComponent implements OnInit, OnDestroy {
  /** When true (nested under the Add form) the hero header + Add Deal button are hidden. */
  readonly embedded = input(false, { transform: booleanAttribute });
  /** When true (e.g. Deal Coverage) the row Actions column (edit / delete) is hidden. */
  readonly hideActions = input(false, { transform: booleanAttribute });

  private readonly service = inject(FtpOrderService);
  private readonly recordings = inject(OrderRecordingService);
  private readonly dropdowns = inject(DropdownService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  /**
   * Screen config from route `data` — reuses this list as the Client Order / Trial
   * Transaction grid: fixed ActiveStatus filter, own title and Add/Edit links.
   */
  protected readonly config: OrderScreenConfig =
    (this.route.snapshot.data['orderConfig'] as OrderScreenConfig | undefined) ?? FTP_ORDER_CONFIG;
  /** True for Client Order / Trial Transaction — the status filter is fixed by the screen. */
  protected readonly fixedStatus = this.config.status != null;

  protected readonly loading = signal(false);
  protected readonly page = signal<PagedResult<FtpOrderListItem>>(emptyPage<FtpOrderListItem>());
  protected readonly pageNumber = signal(1);
  // Server-side paging: fetch 50 rows per page (first load + each Next/Prev hits the server).
  protected readonly pageSize = signal(50);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filters = signal<OrderFilters>({
    orderNumber: '',
    client: '',
    transactionType: '',
    impExp: '',
    currency: '',
    amount: '',
    maturity: '',
    status: '',
    createdDateTime:''
  });

  private reloadTimer?: ReturnType<typeof setTimeout>;

  /**
   * Reload trigger. switchMap makes each load CANCEL the previous in-flight
   * request (latest-wins) so fast typing in the column search boxes can't race
   * — an earlier response can never overwrite a later one, and we don't pile up
   * concurrent DB reads. catchError keeps the stream alive after a failed load.
   */
  private readonly reload$ = new Subject<void>();

  constructor() {
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          const f = this.filters();
          return this.service
            .getPaged(
              { pageNumber: this.pageNumber(), pageSize: this.pageSize(), search: null },
              {
                orderNumber: f.orderNumber || undefined,
                client: f.client || undefined,
                transactionType: f.transactionType || undefined,
                impExp: f.impExp || undefined,
                currency: f.currency || undefined,
                amount: f.amount || undefined,
                maturity: f.maturity || undefined,
                // Client Order / Trial Transaction pin the status; FTP uses the search filter.
                status: this.config.status ?? (f.status || undefined),
                createdDateTime: f.createdDateTime || undefined,
              },
            )
            .pipe(
              catchError(() => {
                this.notify.error('Could not load orders. Please try again.');
                return of(emptyPage<FtpOrderListItem>());
              }),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.page.set(res);
        this.loading.set(false);
      });
  }

  // --- Dropdown search panel (below the grid) -------------------------------
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly txnOptions = signal<SelectOption[]>([]);
  protected readonly impExpOptions: SelectOption[] = [
    { value: 'Import', label: 'Import' },
    { value: 'Export', label: 'Export' },
  ];
  protected readonly statusOptions: SelectOption[] = [
    { value: 'New', label: 'New' },
    { value: 'Done', label: 'Done' },
    { value: 'InvoiceGenerated', label: 'Invoice Generated' },
    { value: 'Progressing', label: 'Progressing' },
    { value: 'Upcoming', label: 'Upcoming' },
  ];

  /** Selected values in the dropdown search panel. */
  protected readonly sClient = signal<string | null>(null);
  protected readonly sImpExp = signal<string | null>(null);
  protected readonly sTxn = signal<string | null>(null);
  protected readonly sStatus = signal<string | null>(null);

  ngOnInit(): void {
    // Options are remapped to value=name because the server filters by name text.
    this.dropdowns
      .get('Client')
      .subscribe((o) => this.clientOptions.set(o.map((x) => ({ value: x.label, label: x.label }))));
    this.dropdowns
      .get('TransactionType')
      .subscribe((o) => this.txnOptions.set(o.map((x) => ({ value: x.label, label: x.label }))));
    this.load();
  }

  /** Apply the dropdown search panel to the server-side filters. */
  protected runSearch(): void {
    this.filters.update((f) => ({
      ...f,
      client: (this.sClient() ?? '').toString(),
      impExp: (this.sImpExp() ?? '').toString(),
      transactionType: (this.sTxn() ?? '').toString(),
      status: (this.sStatus() ?? '').toString(),
    }));
    this.pageNumber.set(1);
    this.load();
  }

  /** Clear the dropdown search panel and its filters. */
  protected clearSearch(): void {
    this.sClient.set(null);
    this.sImpExp.set(null);
    this.sTxn.set(null);
    this.sStatus.set(null);
    this.filters.update((f) => ({ ...f, client: '', impExp: '', transactionType: '', status: '' }));
    this.pageNumber.set(1);
    this.load();
  }

  /** Trigger a reload; switchMap in the constructor cancels any in-flight load. */
  protected load(): void {
    this.reload$.next();
  }

  protected setFilter(key: keyof OrderFilters, value: string): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.pageNumber.set(1);
      this.load();
    }, 350);
  }

  protected onPageSize(value: string | number): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
    this.load();
  }

  protected readonly fromRow = () =>
    this.page().totalCount === 0 ? 0 : (this.page().pageNumber - 1) * this.page().pageSize + 1;
  protected readonly toRow = () =>
    Math.min(this.page().pageNumber * this.page().pageSize, this.page().totalCount);

  protected first(): void {
    if (this.page().hasPrevious) {
      this.pageNumber.set(1);
      this.load();
    }
  }
  protected prev(): void {
    if (this.page().hasPrevious) {
      this.pageNumber.update((n) => n - 1);
      this.load();
    }
  }
  protected next(): void {
    if (this.page().hasNext) {
      this.pageNumber.update((n) => n + 1);
      this.load();
    }
  }
  protected last(): void {
    if (this.page().hasNext) {
      this.pageNumber.set(this.page().totalPages || 1);
      this.load();
    }
  }

  // --- Attached media (Voice / Screenshot) popover --------------------------
  /** The order whose media popover is open, or null when closed. */
  protected readonly mediaOrder = signal<FtpOrderListItem | null>(null);
  protected readonly mediaType = signal<RecordingType>('Voice');
  protected readonly mediaFiles = signal<OrderRecording[]>([]);
  protected readonly mediaLoading = signal(false);

  /** Currently-playing voice file (object URL + label). */
  protected readonly playingUrl = signal<string | null>(null);
  protected readonly playingName = signal<string>('');

  /** Open the Voice/Screenshot list for an order (skips empty cells). */
  protected openMedia(order: FtpOrderListItem, type: RecordingType): void {
    const count = type === 'Voice' ? order.voiceCount : order.screenshotCount;
    if (!count) return;
    this.mediaOrder.set(order);
    this.mediaType.set(type);
    this.mediaFiles.set([]);
    this.mediaLoading.set(true);
    this.recordings.list(order.recordId).subscribe({
      next: (rows) => {
        const wantVoice = type === 'Voice';
        // Voice files may be stored as 'Voice' or truncated to 'V' — match first letter.
        this.mediaFiles.set(
          rows.filter((r) => (r.documentType ?? '').trim().toLowerCase().startsWith('v') === wantVoice),
        );
        this.mediaLoading.set(false);
      },
      error: () => {
        this.mediaLoading.set(false);
        this.notify.error('Could not load the attached files.');
      },
    });
  }

  protected closeMedia(): void {
    this.revokePlaying();
    this.mediaOrder.set(null);
    this.mediaFiles.set([]);
  }

  /** Play a voice file inline, or open a screenshot in a new tab. */
  protected openFile(rec: OrderRecording): void {
    this.recordings.getFile(rec.recordId, rec.fileName).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (this.mediaType() === 'Voice') {
          this.revokePlaying();
          this.playingUrl.set(url);
          this.playingName.set(this.displayName(rec.fileName));
        } else {
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      },
      error: () => this.notify.error('Could not open the file.'),
    });
  }

  /** Recover the original file name from the stored "{guid}_{name}" path. */
  protected displayName(fileName: string): string {
    const base = (fileName ?? '').split('/').pop() ?? fileName ?? '';
    const underscore = base.indexOf('_');
    return underscore >= 0 && underscore < base.length - 1 ? base.slice(underscore + 1) : base;
  }

  private revokePlaying(): void {
    const url = this.playingUrl();
    if (url) URL.revokeObjectURL(url);
    this.playingUrl.set(null);
    this.playingName.set('');
  }

  ngOnDestroy(): void {
    this.revokePlaying();
  }

  protected remove(order: FtpOrderListItem): void {
    this.confirm
      .confirm({
        title: 'Mark order inactive?',
        message: `Order ${order.orderNumber || '#' + order.recordId} will be set to Inactive.`,
        confirmText: 'Mark Inactive',
        icon: 'block',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.delete(order.recordId).subscribe(() => {
          this.notify.success('Order marked inactive.');
          this.load();
        });
      });
  }
}
