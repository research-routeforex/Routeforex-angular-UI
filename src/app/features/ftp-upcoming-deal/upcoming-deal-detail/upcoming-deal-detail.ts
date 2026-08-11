import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { SelectOption } from '../../../shared/components/select/select';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FtpOrderDetail } from '../../ftp-order-entry/ftp-order.model';
import { FtpOrderService } from '../../ftp-order-entry/ftp-order.service';

/**
 * Read-only detail for an Upcoming deal (the list's eye action). Reuses the FTP
 * Order Entry get-by-id API and resolves Client / Client Bank / Transaction Type
 * ids to their display names via the shared dropdowns.
 */
@Component({
  selector: 'app-upcoming-deal-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, MatButtonModule, MatIconModule, DatePipe, DecimalPipe],
  templateUrl: './upcoming-deal-detail.html',
  styleUrl: './upcoming-deal-detail.scss',
})
export class UpcomingDealDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(FtpOrderService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly order = signal<FtpOrderDetail | null>(null);

  private readonly clientOptions = signal<SelectOption[]>([]);
  private readonly bankOptions = signal<SelectOption[]>([]);
  private readonly txnOptions = signal<SelectOption[]>([]);

  protected readonly clientName = computed(() =>
    label(this.clientOptions(), this.order()?.clientID),
  );
  protected readonly bankName = computed(() => label(this.bankOptions(), this.order()?.clientBank));
  protected readonly txnName = computed(() =>
    label(this.txnOptions(), this.order()?.transactionTypeID),
  );

  constructor() {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
    this.dropdowns.get('TransactionType').subscribe((o) => this.txnOptions.set(o));

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.service.getById(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
        if (o.clientID) {
          this.dropdowns.get('ClientBank', o.clientID).subscribe((b) => this.bankOptions.set(b));
        }
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load the deal.');
      },
    });
  }

  protected back(): void {
    void this.router.navigate(['/ftp-upcoming-deal']);
  }
}

/** Resolve a dropdown option's label by its (numeric) value; falls back to the id. */
function label(options: SelectOption[], value: number | null | undefined): string {
  if (value == null) return '—';
  const found = options.find((o) => String(o.value) === String(value));
  return found?.label ?? String(value);
}
