import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { emptyPage, PagedResult } from '../../../core/models/pagination.model';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { FtpOrderListItem } from '../ftp-order.model';
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
}

@Component({
  selector: 'app-ftp-order-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './ftp-order-list.html',
  styleUrl: './ftp-order-list.scss',
})
export class FtpOrderListComponent implements OnInit {
  private readonly service = inject(FtpOrderService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(false);
  protected readonly page = signal<PagedResult<FtpOrderListItem>>(emptyPage<FtpOrderListItem>());
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = signal(20);
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
  });

  private reloadTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    const f = this.filters();
    this.service
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
          status: f.status || undefined,
        },
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((res) => this.page.set(res));
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
