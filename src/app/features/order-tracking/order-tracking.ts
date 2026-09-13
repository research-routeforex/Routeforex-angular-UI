import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { SaveTrackingStep, TrackingOrder, TrackingStep } from './order-tracking.model';
import { OrderTrackingService } from './order-tracking.service';

/** Editable status labels (legacy order + Cancelled). */
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Order placed', label: 'Order placed' },
  { value: 'Processed', label: 'Processed' },
  { value: 'Out for delivery', label: 'Out for delivery' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

/** The four default timeline steps, in order. */
const DEFAULT_STEPS = ['Order placed', 'Processed', 'Out for delivery', 'Delivered'];

/** One editable timeline row in the form. */
interface StepRow {
  checked: boolean;
  status: string | null;
  /** datetime-local string, e.g. "2019-06-24T11:59". */
  date: string;
}

/**
 * Order Tracking (Masters) — new-app rewrite of the legacy money-changing
 * screen. Pick an order/lead and maintain its delivery timeline (a fixed set of
 * steps: reached-flag + status + date), plus an overall current status and a
 * delivery boy. Saving replaces the order's whole timeline. Backed by
 * usp_RF_OrderTracking_* (CF_TXN_LEAD_TRACK).
 */
@Component({
  selector: 'app-order-tracking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PageHeaderComponent,
    SelectComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
})
export class OrderTrackingComponent implements OnInit {
  private readonly service = inject(OrderTrackingService);
  private readonly notify = inject(NotificationService);

  protected readonly rows = signal<TrackingOrder[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  /** true once an existing order is being edited (order pick is locked). */
  protected readonly editing = signal(false);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly orderOptions = signal<SelectOption[]>([]);
  protected readonly deliveryBoyOptions = signal<SelectOption[]>([]);

  // Form state
  protected readonly orderId = signal<number | null>(null);
  protected readonly currentStatus = signal<string | null>(null);
  protected readonly deliveryBoyId = signal<number | null>(null);
  protected readonly steps = signal<StepRow[]>(this.defaultSteps());

  // List filter
  protected readonly filterText = signal('');

  protected readonly total = computed(() => this.rows().length);

  /** Label of the order being edited (shown read-only in place of the select). */
  protected readonly selectedOrderLabel = computed<string>(() => {
    const id = this.orderId();
    return this.orderOptions().find((o) => o.value === id)?.label ?? '';
  });

  ngOnInit(): void {
    this.service.getOrders().subscribe((orders) => this.orderOptions.set(this.toOrderOptions(orders)));
    this.service.getDeliveryBoyOptions().subscribe((o) => this.deliveryBoyOptions.set(o));
    this.load();
  }

  private toOrderOptions(orders: TrackingOrder[]): SelectOption[] {
    // Legacy label: "ClientName~OrderNumber~Currency~Quantity".
    return orders.map((o) => ({
      value: o.orderId,
      label: `${o.clientName ?? ''}~${o.orderNumber ?? ''}~${o.currencyCode ?? ''}~${o.quantity ?? ''}`,
    }));
  }

  private defaultSteps(): StepRow[] {
    return DEFAULT_STEPS.map((s) => ({ checked: false, status: s, date: '' }));
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .search(this.filterText() || null)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.rows.set(rows));
  }

  // --- Filters --------------------------------------------------------------
  protected onFilterText(value: string): void {
    this.filterText.set(value);
  }
  protected search(): void {
    this.load();
  }
  protected clearFilters(): void {
    this.filterText.set('');
    this.load();
  }

  // --- Add / edit form ------------------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.resetForm();
      this.showForm.set(true);
    }
  }

  protected edit(row: TrackingOrder): void {
    this.resetForm();
    this.editing.set(true);
    this.orderId.set(row.orderId);
    this.showForm.set(true);
    this.service.getByOrder(row.orderId).subscribe((steps) => this.applyTimeline(steps));
  }

  /** Populate current status, delivery boy and the step rows from saved data. */
  private applyTimeline(saved: TrackingStep[]): void {
    if (saved.length === 0) return;
    this.currentStatus.set(saved[0].currentStatus ?? null);
    this.deliveryBoyId.set(saved[0].deliveryBoyID ?? null);

    const next = this.defaultSteps();
    saved.forEach((s, i) => {
      if (i >= next.length) return;
      next[i] = {
        checked: !!s.isActive,
        status: s.orderStatus ?? next[i].status,
        date: this.toLocalInput(s.orderDate),
      };
    });
    this.steps.set(next);
  }

  private resetForm(): void {
    this.editing.set(false);
    this.orderId.set(null);
    this.currentStatus.set(null);
    this.deliveryBoyId.set(null);
    this.steps.set(this.defaultSteps());
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.resetForm();
  }

  // --- Form field handlers --------------------------------------------------
  protected onOrder(value: number | null): void {
    this.orderId.set(value);
  }
  protected onCurrentStatus(value: string | null): void {
    this.currentStatus.set(value);
  }
  protected onDeliveryBoy(value: number | null): void {
    this.deliveryBoyId.set(value);
  }
  protected onStepChecked(index: number, checked: boolean): void {
    this.patchStep(index, { checked });
  }
  protected onStepStatus(index: number, status: string | null): void {
    this.patchStep(index, { status });
  }
  protected onStepDate(index: number, date: string): void {
    this.patchStep(index, { date });
  }
  private patchStep(index: number, patch: Partial<StepRow>): void {
    this.steps.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // --- Save -----------------------------------------------------------------
  protected save(): void {
    if (this.saving()) return;
    const orderId = this.orderId();
    if (!orderId) {
      this.notify.error('Select an order first.');
      return;
    }
    // Keep only rows that have a status (matches the legacy skip-blank behaviour).
    const steps: SaveTrackingStep[] = this.steps()
      .map((r, i) => ({
        sno: i + 1,
        orderStatus: r.status,
        orderDate: r.date ? `${r.date}:00`.slice(0, 19) : null,
        isActive: r.checked,
      }))
      .filter((s) => !!s.orderStatus);

    if (steps.length === 0) {
      this.notify.error('Add at least one status step.');
      return;
    }

    this.saving.set(true);
    this.service
      .save({
        orderId,
        currentStatus: this.currentStatus(),
        deliveryBoyID: this.deliveryBoyId(),
        steps,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success('Order tracking saved.');
        this.closeForm();
        this.load();
      });
  }

  /** API ISO datetime -> "yyyy-MM-ddTHH:mm" for a datetime-local input. */
  private toLocalInput(iso: string | null): string {
    if (!iso) return '';
    // Accept "2019-06-24T11:59:00" or "2019-06-24 11:59:00".
    const t = iso.replace(' ', 'T');
    return t.length >= 16 ? t.slice(0, 16) : '';
  }
}
