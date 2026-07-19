import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ForwardDeal } from '../ftp-order.model';
import { FtpOrderService } from '../ftp-order.service';

/** Dialog input: which client's Forwards to list, and (edit mode) the current record. */
export interface ForwardDealPickerData {
  clientId: number;
  recordId?: number;
  /** Heading verb — "cancel" or "utilize" — so the copy matches the transaction type. */
  action: 'cancel' | 'utilize';
}

/**
 * Picker shown when a Forward Cancellation / Utilization is being entered. Lists the
 * client's open Forward deals (remaining Balance > 0) and returns the one the user picks.
 */
@Component({
  selector: 'app-forward-deal-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe, DecimalPipe],
  templateUrl: './forward-deal-picker.html',
  styleUrl: './forward-deal-picker.scss',
})
export class ForwardDealPickerComponent implements OnInit {
  private readonly service = inject(FtpOrderService);
  private readonly ref = inject(MatDialogRef<ForwardDealPickerComponent, ForwardDeal>);
  protected readonly data = inject<ForwardDealPickerData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly deals = signal<ForwardDeal[]>([]);

  protected readonly title =
    this.data.action === 'cancel' ? 'Select a Forward to cancel' : 'Select a Forward to utilize';

  ngOnInit(): void {
    this.service
      .getForwardDeals(this.data.clientId, this.data.recordId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.deals.set(rows));
  }

  protected select(deal: ForwardDeal): void {
    this.ref.close(deal);
  }

  protected close(): void {
    this.ref.close();
  }
}
