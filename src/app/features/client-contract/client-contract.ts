import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { FieldComponent } from '../../shared/components/field/field';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SelectComponent, SelectOption } from '../../shared/components/select/select';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DropdownService } from '../../shared/services/dropdown.service';
import { ClientContract, LookupItem } from '../clients/client.model';
import { ClientsService } from '../clients/clients.service';

/**
 * Client Contract (Masters) — standalone screen for the same contract management
 * that also lives as a tab inside Client Master. On load it shows every client's
 * contracts. The Client dropdown is a filter (narrow the list to one client).
 * "Add Contract" (top) opens the form, where the client to attach the contract
 * to is selected. Save / edit / delete reuse the existing per-client API.
 */
@Component({
  selector: 'app-client-contract',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FieldComponent,
    SelectComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './client-contract.html',
  styleUrl: './client-contract.scss',
})
export class ClientContractComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ClientsService);
  private readonly dropdowns = inject(DropdownService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly contracts = signal<ClientContract[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal(0);

  /** Top-of-page Client dropdown used only to filter the list. */
  protected readonly filterClientId = signal<number | null>(null);

  // Dropdown options
  protected readonly clientOptions = signal<SelectOption[]>([]);
  protected readonly serviceOptions = signal<SelectOption[]>([]);
  protected readonly chargesTypeOptions = signal<SelectOption[]>([]);
  protected readonly statusOptions = signal<SelectOption[]>([]);
  /** Charges Details — multi-select source + the currently checked ids. */
  protected readonly chargeDetailItems = signal<LookupItem[]>([]);
  protected readonly selectedDetails = signal<Set<number>>(new Set());

  protected readonly form = this.fb.nonNullable.group({
    clientId: this.fb.control<number | null>(null, [Validators.required]),
    serviceId: this.fb.control<number | null>(null, [Validators.required]),
    chargesType: this.fb.control<number | null>(null),
    chargesValue: this.fb.control<number | null>(null),
    effectiveFrom: [''],
    effectiveTo: [''],
    status: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.dropdowns.get('Client').subscribe((o) => this.clientOptions.set(o));
    this.service.getContractLookups().subscribe((l) => {
      this.serviceOptions.set(toIdOptions(l.services));
      this.chargesTypeOptions.set(toIdOptions(l.chargesTypes));
      this.statusOptions.set(toNameOptions(l.statuses));
      this.chargeDetailItems.set(l.chargesDetails);
    });
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .getAllContracts(this.filterClientId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((rows) => this.contracts.set(rows));
  }

  // --- List filter ----------------------------------------------------------
  protected onFilterChange(clientId: number | null): void {
    this.filterClientId.set(clientId);
    this.load();
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
      this.form.controls.clientId.enable();
      // Pre-select the filtered client (if any) as a convenience.
      this.form.controls.clientId.setValue(this.filterClientId());
      this.selectedDetails.set(new Set());
      this.showForm.set(true);
    }
  }

  protected edit(c: ClientContract): void {
    this.editingId.set(c.contractId);
    this.form.reset();
    this.form.patchValue({
      clientId: c.clientId,
      serviceId: c.serviceID ?? null,
      chargesType: c.chargesType ? Number(c.chargesType) : null,
      chargesValue: c.chargesValue ?? null,
      effectiveFrom: c.effectiveFrom ? c.effectiveFrom.slice(0, 10) : '',
      effectiveTo: c.effectiveTo ? c.effectiveTo.slice(0, 10) : '',
      status: c.status ?? null,
    });
    // A contract can't be moved between clients on edit — lock the selector.
    this.form.controls.clientId.disable();
    this.selectedDetails.set(parseCsv(c.chargesDetail));
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(0);
    this.form.controls.clientId.enable();
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
      .saveContract(v.clientId!, {
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
        this.load();
      });
  }

  protected remove(c: ClientContract): void {
    this.confirm
      .confirm({
        title: 'Remove contract?',
        message: `Remove ${c.serviceName || 'this contract'} from ${c.clientName || 'the client'}?`,
        confirmText: 'Remove',
        icon: 'delete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.service.deleteContract(c.contractId).subscribe(() => {
          this.notify.success('Contract removed.');
          this.load();
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
