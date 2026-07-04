import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldComponent } from '../../../shared/components/field/field';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ClientContract, LookupItem } from '../client.model';
import { ClientsService } from '../clients.service';

@Component({
  selector: 'app-client-contracts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './client-contracts.html',
  styleUrl: '../client-banks/client-child.scss',
})
export class ClientContractsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClientsService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  readonly clientId = input.required<number>();

  protected readonly contracts = signal<ClientContract[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal(0);

  // Dropdown options
  protected readonly serviceOptions = signal<SelectOption[]>([]);
  protected readonly chargesTypeOptions = signal<SelectOption[]>([]);
  protected readonly statusOptions = signal<SelectOption[]>([]);
  /** Charges Details — multi-select source + the currently checked ids. */
  protected readonly chargeDetailItems = signal<LookupItem[]>([]);
  protected readonly selectedDetails = signal<Set<number>>(new Set());

  protected readonly form = this.fb.nonNullable.group({
    serviceId: this.fb.control<number | null>(null, [Validators.required]),
    chargesType: this.fb.control<number | null>(null),
    chargesValue: this.fb.control<number | null>(null),
    effectiveFrom: [''],
    effectiveTo: [''],
    status: this.fb.control<string | null>(null),
  });

  constructor() {
    this.service.getContractLookups().subscribe((l) => {
      this.serviceOptions.set(toIdOptions(l.services));
      this.chargesTypeOptions.set(toIdOptions(l.chargesTypes));
      this.statusOptions.set(toNameOptions(l.statuses));
      this.chargeDetailItems.set(l.chargesDetails);
    });

    effect(() => {
      const id = this.clientId();
      if (id > 0) this.load(id);
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.service
      .getContracts(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.contracts.set(rows));
  }

  // --- Charges Details multi-select ----------------------------------------
  protected isChecked(id: number): boolean {
    return this.selectedDetails().has(id);
  }
  protected toggleDetail(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedDetails.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // --- Form open / edit / close --------------------------------------------
  protected toggleForm(): void {
    if (this.showForm()) this.closeForm();
    else {
      this.editingId.set(0);
      this.form.reset();
      this.selectedDetails.set(new Set());
      this.showForm.set(true);
    }
  }

  protected edit(c: ClientContract): void {
    this.editingId.set(c.contractId);
    this.form.reset();
    this.form.patchValue({
      serviceId: c.serviceID ?? null,
      chargesType: c.chargesType ? Number(c.chargesType) : null,
      chargesValue: c.chargesValue ?? null,
      effectiveFrom: c.effectiveFrom ? c.effectiveFrom.slice(0, 10) : '',
      effectiveTo: c.effectiveTo ? c.effectiveTo.slice(0, 10) : '',
      status: c.status ?? null,
    });
    this.selectedDetails.set(parseCsv(c.chargesDetail));
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.form.reset();
    this.selectedDetails.set(new Set());
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const editing = this.editingId() > 0;
    this.service
      .saveContract(this.clientId(), {
        contractId: this.editingId(),
        serviceID: v.serviceId,
        chargesType: v.chargesType !== null ? String(v.chargesType) : null,
        chargesDetail: [...this.selectedDetails()].join(',') || null,
        chargesValue: v.chargesValue,
        effectiveFrom: v.effectiveFrom || null,
        effectiveTo: v.effectiveTo || null,
        status: v.status,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(() => {
        this.notify.success(editing ? 'Contract updated.' : 'Contract added.');
        this.closeForm();
        this.load(this.clientId());
      });
  }

  protected remove(c: ClientContract): void {
    this.confirm
      .confirm({
        title: 'Remove contract?',
        message: `Remove ${c.serviceName || 'this contract'} from the client?`,
        confirmText: 'Remove',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteContract(c.contractId).subscribe(() => {
          this.notify.success('Contract removed.');
          this.load(this.clientId());
        });
      });
  }
}

function toIdOptions(items: LookupItem[]): SelectOption[] {
  return items.map((i) => ({ value: i.id, label: i.name }));
}
function toNameOptions(items: LookupItem[]): SelectOption[] {
  return items.map((i) => ({ value: i.name, label: i.name }));
}
function parseCsv(csv: string | null | undefined): Set<number> {
  const set = new Set<number>();
  if (!csv) return set;
  for (const part of csv.split(',')) {
    const n = Number(part.trim());
    if (!Number.isNaN(n)) set.add(n);
  }
  return set;
}
