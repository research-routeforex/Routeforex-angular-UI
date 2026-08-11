import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { emptyPage, PagedResult } from '../../../core/models/pagination.model';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../../../shared/date/dmy-date-adapter';
import { OpenDatepickerOnFocusDirective } from '../../../shared/directives/open-datepicker-on-focus.directive';
import { FtpOrderListItem } from '../../ftp-order-entry/ftp-order.model';
import { FtpOrderService } from '../../ftp-order-entry/ftp-order.service';

/**
 * FTP Upcoming Deal list — every order scheduled ahead (ActiveStatus = 'Upcoming').
 * Reuses the FTP Order Entry paged endpoint (usp_RF_FtpOrder_GetPaged) with a fixed
 * status='Upcoming' filter; the eye action opens a read-only detail and the edit
 * action deep-links into the Dealer Pad for the same order.
 */
@Component({
  selector: 'app-upcoming-deal-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeaderComponent,
    MatButtonModule,
    MatDatepickerModule,
    MatIconModule,
    MatTooltipModule,
    OpenDatepickerOnFocusDirective,
    DatePipe,
    DecimalPipe,
  ],
  // dd-MMM-yyyy datepicker, matching every other screen's date field.
  providers: [
    provideNativeDateAdapter(DMY_DATE_FORMATS),
    { provide: DateAdapter, useClass: DmyDateAdapter },
  ],
  templateUrl: './upcoming-deal-list.html',
  styleUrls: ['../../ftp-order-entry/ftp-order-list/ftp-order-list.scss', './upcoming-deal-list.scss'],
})
export class UpcomingDealListComponent implements OnInit {
  private readonly service = inject(FtpOrderService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly page = signal<PagedResult<FtpOrderListItem>>(emptyPage<FtpOrderListItem>());
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = signal(50);
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  /** Single search box (Client / Bank / Import-Export) and the Upcoming-Date filter. */
  protected readonly search = signal('');
  protected readonly upcomingDate = signal<Date | null>(null);

  private readonly reload$ = new Subject<void>();

  constructor() {
    // switchMap → latest-wins: a new load cancels the previous in-flight request.
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          return this.service
            .getPaged(
              { pageNumber: this.pageNumber(), pageSize: this.pageSize(), search: this.search() || null },
              { status: 'Upcoming', upcomingDate: toProcDate(this.upcomingDate()) },
            )
            .pipe(
              catchError(() => {
                this.notify.error('Could not load upcoming deals. Please try again.');
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

  ngOnInit(): void {
    this.load();
  }

  protected runSearch(): void {
    this.pageNumber.set(1);
    this.load();
  }

  protected clearSearch(): void {
    this.search.set('');
    this.upcomingDate.set(null);
    this.pageNumber.set(1);
    this.load();
  }

  protected load(): void {
    this.reload$.next();
  }

  /** Eye → read-only detail. */
  protected view(o: FtpOrderListItem): void {
    void this.router.navigate(['/ftp-upcoming-deal', o.recordId]);
  }

  /** Edit → open the same order in the Dealer Pad (legacy Vendor-Board?RecordID=…). */
  protected edit(o: FtpOrderListItem): void {
    void this.router.navigate(['/dealer-pad'], { queryParams: { recordId: o.recordId } });
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
}

/** Date → "dd MMM yyyy" to match the proc's style-106 LIKE on UpcomingDate. */
function toProcDate(d: Date | null): string | undefined {
  if (!d || Number.isNaN(d.getTime())) return undefined;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
