import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { ExecutiveDashboardService } from '../executive-dashboard.service';
import { ExecutiveDashboardRow, ExecutiveUcRequest, UcMode } from '../executive-dashboard.models';

/** Dialog input: the deal row, the client, and which UC action to record. */
export interface ExecutiveUcDialogData {
  mode: UcMode;
  row: ExecutiveDashboardRow;
  clientId: number;
}

/**
 * Records a Utilization or Cancellation against an Executive Dashboard deal.
 * One component, two layouts: Utilization shows EDC Charge + (computed) Final Rate;
 * Cancellation shows Spot / Premium / Cancellation Rate / Profit &amp; Loss.
 */
@Component({
  selector: 'app-executive-uc-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, FieldComponent, DecimalPipe],
  templateUrl: './executive-uc-dialog.html',
  styleUrl: './executive-uc-dialog.scss',
})
export class ExecutiveUcDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly svc = inject(ExecutiveDashboardService);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<ExecutiveUcDialogComponent, boolean>);
  protected readonly data = inject<ExecutiveUcDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly isUtilization = this.data.mode === 'Utilization';

  protected readonly outstanding = this.data.row.amountOutstanding || 0;
  protected readonly bookingRate = this.data.row.forwardContractRateBooked || 0;

  /** Partial = user enters an amount up to the balance; Full = the whole balance. */
  protected readonly partialFull = signal<'Partial' | 'Full'>('Partial');

  protected readonly form = this.fb.nonNullable.group({
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    // Utilization
    edcCharge: this.fb.control<number | null>(null),
    // Cancellation
    spot: this.fb.control<number | null>(null),
    premiumCashSpot: this.fb.control<number | null>(null),
    cancellationRate: this.fb.control<number | null>(null),
    profitLoss: this.fb.control<number | null>(null),
  });

  /** Live mirrors of the inputs the computed fields depend on. */
  private readonly amount = signal<number | null>(null);
  private readonly edc = signal<number | null>(null);

  /** Utilization: Final Rate = Booking Rate − EDC Charge. */
  protected readonly finalRate = computed(() => this.bookingRate - (this.edc() ?? 0));

  constructor() {
    if (this.isUtilization) {
      this.form.controls.edcCharge.addValidators(Validators.required);
    } else {
      this.form.controls.spot.addValidators(Validators.required);
      this.form.controls.cancellationRate.addValidators(Validators.required);
    }

    this.form.controls.amount.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.amount.set(v));
    this.form.controls.edcCharge.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.edc.set(v));

    // Cancellation: Cancellation Rate defaults to Spot + Premium (editable).
    this.form.controls.spot.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncCancellationRate());
    this.form.controls.premiumCashSpot.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncCancellationRate());
    // Profit / Loss defaults to (Cancellation Rate − Booking Rate) × amount (editable).
    this.form.controls.cancellationRate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncProfitLoss());
  }

  private syncCancellationRate(): void {
    const rate = (this.form.controls.spot.value ?? 0) + (this.form.controls.premiumCashSpot.value ?? 0);
    this.form.controls.cancellationRate.setValue(rate, { emitEvent: false });
    this.syncProfitLoss();
  }

  private syncProfitLoss(): void {
    const rate = this.form.controls.cancellationRate.value ?? 0;
    const amt = this.form.controls.amount.value ?? 0;
    this.form.controls.profitLoss.setValue((rate - this.bookingRate) * amt, { emitEvent: false });
  }

  /** Switch Partial/Full — Full locks the amount to the whole outstanding balance. */
  protected setPartialFull(v: 'Partial' | 'Full'): void {
    this.partialFull.set(v);
    const amount = this.form.controls.amount;
    if (v === 'Full') {
      amount.setValue(this.outstanding);
      amount.disable();
    } else {
      amount.enable();
      amount.setValue(null);
    }
  }

  protected submit(): void {
    // Amount must not exceed the outstanding balance.
    const amt = this.form.controls.amount.value ?? 0;
    if (this.partialFull() === 'Partial' && amt > this.outstanding) {
      this.notify.error(`Amount cannot exceed the outstanding balance (${this.outstanding}).`);
      return;
    }
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fill the required fields.');
      return;
    }

    const v = this.form.getRawValue();
    const request: ExecutiveUcRequest = {
      executiveID: this.data.row.recordID,
      transactionType: this.data.mode,
      isPartialFull: this.partialFull(),
      importExport: this.data.row.type ?? null,
      clientID: this.data.clientId,
      utilizationAmount: v.amount ?? 0,
      edcCharge: v.edcCharge ?? 0,
      finalRate: this.isUtilization ? this.finalRate() : 0,
      spot: v.spot ?? 0,
      premiumCashSpot: v.premiumCashSpot ?? 0,
      cancellationRate: v.cancellationRate ?? 0,
      profitLoss: v.profitLoss ?? 0,
    };

    this.saving.set(true);
    this.svc
      .saveUc(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.notify.success(res.message || `${this.data.mode} saved.`);
            this.ref.close(true);
          } else {
            this.notify.error(res.message || `Could not save the ${this.data.mode.toLowerCase()}.`);
          }
        },
        error: () => this.notify.error(`Could not save the ${this.data.mode.toLowerCase()}.`),
      });
  }

  protected close(): void {
    this.ref.close();
  }
}
