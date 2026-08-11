import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { DropdownService } from '../../shared/services/dropdown.service';
import { FtpOrderListComponent } from '../ftp-order-entry/ftp-order-list/ftp-order-list';
import { OrderDocumentsComponent } from '../ftp-order-entry/order-documents/order-documents';
import { ClientOrder } from '../ftp-order-entry/ftp-order.model';
import { FtpOrderService } from '../ftp-order-entry/ftp-order.service';

/**
 * Deal Coverage — the FTP Order Entry list, but the primary action attaches
 * documents to an existing order instead of booking a new one. "Upload Document"
 * opens a panel: pick a client, pick one of that client's orders, then use the
 * same Voice / Screenshot upload panel as FTP Order Entry (existing files shown,
 * with the option to add more).
 */
@Component({
  selector: 'app-deal-coverage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeaderComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    FtpOrderListComponent,
    OrderDocumentsComponent,
  ],
  templateUrl: './deal-coverage.html',
  styleUrl: './deal-coverage.scss',
})
export class DealCoverageComponent implements OnInit {
  private readonly dropdowns = inject(DropdownService);
  private readonly service = inject(FtpOrderService);

  protected readonly showUpload = signal(false);

  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly orders = signal<ClientOrder[]>([]);
  protected readonly ordersLoading = signal(false);

  protected readonly selectedClientId = signal<number | null>(null);
  protected readonly selectedRecordId = signal<number | null>(null);

  /** Order dropdown options, derived from the selected client's orders. */
  protected readonly orderOptions = computed<SelectOption[]>(() =>
    this.orders().map((o) => ({
      value: o.recordId,
      label: [
        o.orderNumber || '#' + o.recordId,
        o.transactionType,
        o.currencyCode,
        o.amount != null ? o.amount.toLocaleString('en-IN') : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  );

  /** The picked order (for the documents panel's clientId / orderNumber inputs). */
  protected readonly selectedOrder = computed<ClientOrder | null>(
    () => this.orders().find((o) => o.recordId === this.selectedRecordId()) ?? null,
  );

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
  }

  protected toggleUpload(): void {
    this.showUpload.update((v) => !v);
  }

  protected onClientChange(clientId: number | null): void {
    this.selectedClientId.set(clientId);
    this.selectedRecordId.set(null);
    this.orders.set([]);
    if (clientId == null) return;

    this.ordersLoading.set(true);
    this.service.getOrdersByClient(clientId).subscribe({
      next: (rows) => {
        this.orders.set(rows ?? []);
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false),
    });
  }
}
